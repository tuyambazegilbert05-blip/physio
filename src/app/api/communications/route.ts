import { z } from 'zod'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const replySchema = z.object({
  group_id: uuidSchema,
  thread_id: uuidSchema,
  body: z.string().trim().min(1).max(5000),
})

export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) {
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  }
  const { data: permissions, error: permissionError } = await auth.supabase.rpc(
    'current_group_permissions',
    {
      target_group: groupId!,
    },
  )
  if (permissionError) return databaseError(permissionError)
  if (!(permissions ?? []).includes('communications:read'))
    return Response.json(
      { error: { message: 'You do not have permission to view official conversations.' } },
      { status: 403 },
    )

  const { data: threads, error: threadError } = await auth.supabase
    .from('chat_threads')
    .select('id,title,created_at')
    .eq('group_id', groupId!)
    .eq('kind', 'official')
    .order('created_at', { ascending: false })
    .limit(200)
  if (threadError) return databaseError(threadError)
  const threadIds = (threads ?? []).map((thread) => thread.id)
  const { data: messages, error: messageError } = threadIds.length
    ? await auth.supabase
        .from('chat_messages')
        .select('id,thread_id,sender_id,body,created_at')
        .in('thread_id', threadIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(2000)
    : { data: [], error: null }
  if (messageError) return databaseError(messageError)
  return Response.json({
    data: {
      current_user_id: auth.user!.id,
      threads: (threads ?? []).map((thread) => ({
        ...thread,
        messages: (messages ?? []).filter((message) => message.thread_id === thread.id),
      })),
    },
  })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true, requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, replySchema)
  if (parsed.response) return parsed.response
  const { data: permissions, error: permissionError } = await auth.supabase.rpc(
    'current_group_permissions',
    {
      target_group: parsed.data.group_id,
    },
  )
  if (permissionError) return databaseError(permissionError)
  if (!(permissions ?? []).includes('communications:read'))
    return Response.json(
      { error: { message: 'You do not have permission to reply to official conversations.' } },
      { status: 403 },
    )

  const { data: thread, error: threadError } = await auth.supabase
    .from('chat_threads')
    .select('id')
    .eq('id', parsed.data.thread_id)
    .eq('group_id', parsed.data.group_id)
    .eq('kind', 'official')
    .maybeSingle()
  if (threadError) return databaseError(threadError)
  if (!thread)
    return Response.json(
      { error: { message: 'This conversation is unavailable.' } },
      { status: 404 },
    )

  const { data, error } = await auth.supabase
    .from('chat_messages')
    .insert({ thread_id: parsed.data.thread_id, sender_id: auth.user!.id, body: parsed.data.body })
    .select('id,thread_id,sender_id,body,created_at')
    .single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}
