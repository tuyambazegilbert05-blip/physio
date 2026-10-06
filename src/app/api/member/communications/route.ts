import { z } from 'zod'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import type { createClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validations'

const communicationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    group_id: uuidSchema,
    title: z.string().trim().min(3).max(160),
    body: z.string().trim().min(1).max(5000),
  }),
  z.object({
    action: z.literal('reply'),
    group_id: uuidSchema,
    thread_id: uuidSchema,
    body: z.string().trim().min(1).max(5000),
  }),
])

async function requireActiveMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  userId: string,
) {
  return supabase
    .from('members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
}

export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response
  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) {
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  }

  const member = await requireActiveMember(auth.supabase, groupId!, auth.user!.id)
  if (member.error) return databaseError(member.error)
  if (!member.data)
    return Response.json(
      { error: { message: 'An active membership is required to contact officials.' } },
      { status: 403 },
    )

  const { data: threads, error: threadError } = await auth.supabase
    .from('chat_threads')
    .select('id,title,created_at')
    .eq('group_id', groupId!)
    .eq('kind', 'official')
    .order('created_at', { ascending: false })
    .limit(100)
  if (threadError) return databaseError(threadError)

  const threadIds = (threads ?? []).map((thread) => thread.id)
  const { data: messages, error: messageError } = threadIds.length
    ? await auth.supabase
        .from('chat_messages')
        .select('id,thread_id,sender_id,body,created_at')
        .in('thread_id', threadIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1000)
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
  const parsed = await readJson(request, communicationSchema)
  if (parsed.response) return parsed.response
  const input = parsed.data

  const member = await requireActiveMember(auth.supabase, input.group_id, auth.user!.id)
  if (member.error) return databaseError(member.error)
  if (!member.data)
    return Response.json(
      { error: { message: 'An active membership is required to send a message.' } },
      { status: 403 },
    )

  if (input.action === 'start') {
    const { data, error } = await auth.supabase.rpc('create_member_official_thread', {
      target_group: input.group_id,
      thread_title: input.title,
      first_message: input.body,
    })
    if (error) return databaseError(error)
    return Response.json({ data: { thread_id: data } }, { status: 201 })
  }

  const { data: thread, error: threadError } = await auth.supabase
    .from('chat_threads')
    .select('id')
    .eq('id', input.thread_id)
    .eq('group_id', input.group_id)
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
    .insert({ thread_id: input.thread_id, sender_id: auth.user!.id, body: input.body })
    .select('id,thread_id,sender_id,body,created_at')
    .single()
  if (error) return databaseError(error)
  return Response.json({ data }, { status: 201 })
}
