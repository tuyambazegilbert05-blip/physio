import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) return Response.json({ error: { message: 'Unable to sign out right now.' } }, { status: 500 })
  return Response.json({ data: { message: 'Signed out.' } })
}
