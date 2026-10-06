import { createAdminClient } from '@/lib/supabase/admin'
import { resolveNextOnboardingStep, type OnboardingSnapshot } from '@/features/membership/lib/onboarding-state'

type MembershipRow = { id: string; group_id: string; joined_at: string }

export async function getIncompleteOnboardingGroup(userId: string, preferredGroupId?: string) {
  const admin = createAdminClient()
  const membershipQuery = admin
    .from('members')
    .select('id,group_id,joined_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
  const { data: memberships, error: membershipError } = preferredGroupId
    ? await membershipQuery.eq('group_id', preferredGroupId)
    : await membershipQuery
  if (membershipError) throw membershipError
  const rows = (memberships ?? []) as MembershipRow[]
  if (!rows.length) return null
  const memberIds = rows.map((row) => row.id)
  const groupIds = rows.map((row) => row.group_id)
  const [stateResult, termsResult, fieldsResult, cyclesResult, groupsResult] = await Promise.all([
    admin.from('member_onboarding').select('*').in('member_id', memberIds),
    admin.from('group_membership_terms').select('group_id,version,is_required').in('group_id', groupIds).eq('is_current', true),
    admin.from('group_member_fields').select('id,group_id,is_required').in('group_id', groupIds).eq('is_active', true).order('display_order'),
    admin.from('group_cycles').select('id,group_id,contribution_amount,share_price,rules').in('group_id', groupIds).eq('status', 'open'),
    admin.from('groups').select('id,contribution_amount,contribution_frequency').in('id', groupIds),
  ])
  for (const result of [stateResult, termsResult, fieldsResult, cyclesResult, groupsResult]) {
    if (result.error) throw result.error
  }
  const shareIds = (stateResult.data ?? []).flatMap((row) => row.share_transaction_id ? [row.share_transaction_id] : [])
  const shareStatusResult = shareIds.length
    ? await admin.from('share_transactions').select('id,status').in('id', shareIds)
    : { data: [], error: null }
  if (shareStatusResult.error) throw shareStatusResult.error
  const shareStatuses = new Map((shareStatusResult.data ?? []).map((row) => [row.id, row.status]))
  const states = new Map((stateResult.data ?? []).map((row) => [row.member_id, {
    ...row,
    share_transaction_status: row.share_transaction_id ? shareStatuses.get(row.share_transaction_id) ?? null : null,
  }]))
  const terms = new Map((termsResult.data ?? []).map((row) => [row.group_id, row]))
  const fields = new Map<string, { id: string; required: boolean }[]>()
  for (const row of fieldsResult.data ?? []) {
    const list = fields.get(row.group_id) ?? []
    list.push({ id: row.id, required: row.is_required })
    fields.set(row.group_id, list)
  }
  const cycles = new Map((cyclesResult.data ?? []).map((row) => [row.group_id, row]))
  const groups = new Map((groupsResult.data ?? []).map((row) => [row.id, row]))
  const ordered = preferredGroupId
    ? rows
    : [...rows].sort((left, right) => Number(Boolean(states.get(left.id)?.completed_at)) - Number(Boolean(states.get(right.id)?.completed_at)))
  for (const membership of ordered) {
    const group = groups.get(membership.group_id)
    if (!group) continue
    const snapshot: OnboardingSnapshot = {
      group,
      cycle: cycles.get(membership.group_id) ?? null,
      terms: terms.get(membership.group_id) ?? null,
      fields: fields.get(membership.group_id) ?? [],
      state: states.get(membership.id) ?? null,
    }
    if (resolveNextOnboardingStep(snapshot)) return membership.group_id
  }
  return null
}
