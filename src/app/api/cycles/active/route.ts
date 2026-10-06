import { databaseError, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response

  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) {
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('group_cycles')
    .select('id,cycle_number,name,starts_on,ends_on,status,rules')
    .eq('group_id', groupId!)
    .eq('status', 'open')
    .maybeSingle()

  if (error) return databaseError(error)
  const rules =
    data?.rules && typeof data.rules === 'object' && !Array.isArray(data.rules) ? data.rules : {}
  const rateUpToFourMonths = Number(
    'interest_rate_up_to_4_months' in rules ? rules.interest_rate_up_to_4_months : 3,
  )
  const rateOverFourMonths = Number(
    'interest_rate_over_4_months' in rules ? rules.interest_rate_over_4_months : 5,
  )
  return Response.json({
    data: data
      ? {
          ...data,
          interest_rates: { up_to_4_months: rateUpToFourMonths, over_4_months: rateOverFourMonths },
        }
      : null,
  })
}
