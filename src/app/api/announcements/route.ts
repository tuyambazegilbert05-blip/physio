import { z } from 'zod'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const announcementSchema = z.object({
  group_id: uuidSchema,
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(1).max(5000),
  publish: z.boolean().default(false),
})
const publishSchema = z.object({ group_id: uuidSchema, announcement_id: uuidSchema })

async function canManageAnnouncements(supabase: Awaited<ReturnType<typeof requireApiUser>>['supabase'], groupId: string) {
  const { data, error } = await supabase.rpc('has_group_permission', {
    target_group: groupId,
    required_permission: 'announcements:manage',
  })
  return { authorized: Boolean(data), error }
}

export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success)
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  const { authorized, error: permissionError } = await canManageAnnouncements(auth.supabase, groupId!)
  if (permissionError) return databaseError(permissionError)
  if (!authorized)
    return Response.json({ error: { message: 'Announcement management permission is required.' } }, { status: 403 })
  const { data, error } = await auth.supabase
    .from('group_announcements')
    .select('id,group_id,title,body,published_at,created_by,created_at')
    .eq('group_id', groupId!)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return databaseError(error)
  return Response.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true, requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, announcementSchema)
  if (parsed.response) return parsed.response
  const { authorized, error: permissionError } = await canManageAnnouncements(auth.supabase, parsed.data.group_id)
  if (permissionError) return databaseError(permissionError)
  if (!authorized)
    return Response.json({ error: { message: 'Announcement management permission is required.' } }, { status: 403 })
  const { data, error } = await auth.supabase
    .from('group_announcements')
    .insert({
      group_id: parsed.data.group_id,
      title: parsed.data.title,
      body: parsed.data.body,
      published_at: parsed.data.publish ? new Date().toISOString() : null,
      created_by: auth.user!.id,
    })
    .select('id,group_id,title,body,published_at,created_by,created_at')
    .single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true, requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, publishSchema)
  if (parsed.response) return parsed.response
  const { authorized, error: permissionError } = await canManageAnnouncements(auth.supabase, parsed.data.group_id)
  if (permissionError) return databaseError(permissionError)
  if (!authorized)
    return Response.json({ error: { message: 'Announcement management permission is required.' } }, { status: 403 })
  const { data, error } = await auth.supabase
    .from('group_announcements')
    .update({ published_at: new Date().toISOString() })
    .eq('id', parsed.data.announcement_id)
    .eq('group_id', parsed.data.group_id)
    .is('published_at', null)
    .select('id,group_id,title,body,published_at,created_by,created_at')
    .maybeSingle()
  if (error) return databaseError(error)
  if (!data) return Response.json({ error: { message: 'This draft is unavailable or was already published.' } }, { status: 404 })
  return Response.json({ data })
}
