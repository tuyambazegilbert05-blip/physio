import { databaseError, requireApiUser } from '@/lib/supabase/route'

export async function POST() {
  const auth = await requireApiUser({ requireVerifiedEmail: false })
  if (auth.response) return auth.response
  const { data, error } = await auth.supabase.rpc('notify_security_sign_in')
  if (error) return databaseError(error)
  return Response.json({ data })
}
