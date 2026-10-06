import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { resolveNextOnboardingStep } from '@/features/membership/lib/onboarding-state'
import { uuidSchema } from '@/lib/validations'
import type { Json } from '@/types/database'

const saveSchema = z.object({
  group_id: uuidSchema,
  step: z.enum(['group_information', 'rules', 'member_information', 'shares', 'contributions', 'complete']),
  payload: z.record(z.string(), z.json()).default({}),
})

export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid group is required.' } }, { status: 400 })
  const admin = createAdminClient()
  const { data: member, error: memberError } = await admin.from('members')
    .select('id,group_id,full_name,phone,status')
    .eq('group_id', groupId!).eq('user_id', auth.user!.id).maybeSingle()
  if (memberError) return databaseError(memberError)
  if (!member || member.status !== 'active') return Response.json({ error: { message: 'An active membership is required for group onboarding.' } }, { status: 403 })

  const [groupResult, cycleResult, termsResult, fieldsResult, stateResult] = await Promise.all([
    admin.from('groups').select('id,name,description,location,currency,contribution_amount,contribution_frequency').eq('id', groupId!).maybeSingle(),
    admin.from('group_cycles').select('id,name,starts_on,ends_on,share_price,contribution_amount,contribution_due_day,rules,status').eq('group_id', groupId!).eq('status', 'open').maybeSingle(),
    admin.from('group_membership_terms').select('id,version,title,body,is_required').eq('group_id', groupId!).eq('is_current', true).maybeSingle(),
    admin.from('group_member_fields').select('id,label,description,field_type,is_required,options,display_order').eq('group_id', groupId!).eq('is_active', true).order('display_order').order('created_at'),
    admin.from('member_onboarding').select('*').eq('member_id', member.id).maybeSingle(),
  ])
  for (const result of [groupResult, cycleResult, termsResult, fieldsResult, stateResult]) {
    if (result.error) return databaseError(result.error)
  }
  if (!groupResult.data) return Response.json({ error: { message: 'This group is unavailable.' } }, { status: 404 })
  let onboardingState: (NonNullable<typeof stateResult.data> & { share_transaction_status?: string | null }) | null = stateResult.data
  if (stateResult.data?.share_transaction_id) {
    const { data: share, error: shareError } = await admin.from('share_transactions')
      .select('status')
      .eq('id', stateResult.data.share_transaction_id)
      .eq('group_id', groupId!)
      .eq('member_id', member.id)
      .maybeSingle()
    if (shareError) return databaseError(shareError)
    onboardingState = { ...stateResult.data, share_transaction_status: share?.status ?? null }
  }
  const snapshot = {
    group: groupResult.data,
    cycle: cycleResult.data,
    terms: termsResult.data,
    fields: (fieldsResult.data ?? []).map((field) => ({ ...field, required: field.is_required })),
    state: onboardingState,
  }
  const step = resolveNextOnboardingStep(snapshot)
  return Response.json({ data: { ...snapshot, step, complete: step === null } }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true, requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, saveSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.rpc('save_member_onboarding_step', {
    target_group: parsed.data.group_id,
    target_step: parsed.data.step,
    target_payload: parsed.data.payload as Json,
  })
  if (error) {
    if (error.code === 'P0001' || error.code === '22023') {
      return Response.json({ error: { message: error.message } }, { status: error.message.includes('active membership') ? 403 : 422 })
    }
    return databaseError(error)
  }
  return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
}
