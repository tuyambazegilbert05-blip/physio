import { profileUpdateSchema } from '@/features/users/schemas/user.schema'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const url = new URL(request.url)
  if (url.searchParams.get('resource') === 'notifications') {
    const { data, error } = await auth.supabase.from('notifications').select('*').eq('user_id', auth.user!.id).order('created_at', { ascending: false }).limit(100)
    if (error) return databaseError(error)
    return Response.json({ data })
  }
  const { data, error } = await auth.supabase.from('profiles').select('*').eq('id', auth.user!.id).single()
  if (error) return databaseError(error)
  return Response.json({ data })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const url = new URL(request.url)
  if (url.searchParams.get('resource') === 'notifications') {
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: { message: 'Notification id is required.' } }, { status: 400 })
    const { data, error } = await auth.supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', auth.user!.id).select().single()
    if (error) return databaseError(error)
    return Response.json({ data })
  }
  const parsed = await readJson(request, profileUpdateSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.from('profiles').update(parsed.data).eq('id', auth.user!.id).select().single()
  if (error) return databaseError(error)
  return Response.json({ data })
}
