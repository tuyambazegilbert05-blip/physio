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
    .from('loan_repayments')
    .select(
      'id,loan_id,group_id,amount,principal_amount,interest_amount,status,received_at,reference,payment_method',
    )
    .eq('group_id', groupId!)
    .order('received_at', { ascending: false })
    .limit(100)

  if (error) return databaseError(error)
  return Response.json({ data })
}
