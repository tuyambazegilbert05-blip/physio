'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/Input'
import { apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'

type ThreadMessage = {
  id: string
  thread_id: string
  sender_id: string
  body: string
  created_at: string
}
type OfficialThread = {
  id: string
  title: string | null
  created_at: string
  messages: ThreadMessage[]
}
type CommunicationData = { current_user_id: string; threads: OfficialThread[] }

export function MemberCommunications({
  groupId,
  audience = 'member',
}: {
  groupId: string
  audience?: 'member' | 'official'
}) {
  const workspaceKey = `${audience}:${groupId}`
  const [loadedWorkspace, setLoadedWorkspace] = useState<{
    key: string
    data: CommunicationData | null
  } | null>(null)
  const data = loadedWorkspace?.key === workspaceKey ? loadedWorkspace.data : null
  const loading = loadedWorkspace?.key !== workspaceKey
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [replyPending, setReplyPending] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})

  const refresh = useCallback(async () => {
    try {
      const endpoint = audience === 'member' ? '/api/member/communications' : '/api/communications'
      const result = await apiRequest<CommunicationData>(
        `${endpoint}?group_id=${encodeURIComponent(groupId)}`,
      )
      setLoadedWorkspace({ key: workspaceKey, data: result })
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your conversations.')
    }
  }, [audience, groupId, workspaceKey])

  useEffect(() => {
    let active = true
    const endpoint = audience === 'member' ? '/api/member/communications' : '/api/communications'
    apiRequest<CommunicationData>(`${endpoint}?group_id=${encodeURIComponent(groupId)}`)
      .then((result) => {
        if (!active) return
        setLoadedWorkspace({ key: workspaceKey, data: result })
        setError('')
      })
      .catch((cause: unknown) => {
        if (!active) return
        setLoadedWorkspace({ key: workspaceKey, data: null })
        setError(cause instanceof Error ? cause.message : 'Unable to load your conversations.')
      })
    return () => {
      active = false
    }
  }, [audience, groupId, workspaceKey])

  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await apiRequest(
        audience === 'member' ? '/api/member/communications' : '/api/communications',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'start', group_id: groupId, title, body }),
        },
      )
      setTitle('')
      setBody('')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send your message.')
    } finally {
      setPending(false)
    }
  }

  async function reply(event: FormEvent<HTMLFormElement>, threadId: string) {
    event.preventDefault()
    const message = replyDraft[threadId]?.trim()
    if (!message) return
    setReplyPending(threadId)
    setError('')
    try {
      await apiRequest(
        audience === 'member' ? '/api/member/communications' : '/api/communications',
        {
          method: 'POST',
          body: JSON.stringify(
            audience === 'member'
              ? { action: 'reply', group_id: groupId, thread_id: threadId, body: message }
              : { group_id: groupId, thread_id: threadId, body: message },
          ),
        },
      )
      setReplyDraft((current) => ({ ...current, [threadId]: '' }))
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send your reply.')
    } finally {
      setReplyPending(null)
    }
  }

  return (
    <div
      className={audience === 'member' ? 'grid gap-4 xl:grid-cols-[0.85fr_1.15fr]' : 'grid gap-4'}
    >
      {audience === 'member' && (
        <section className="h-fit rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-[#7B3FF2]">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-heading text-base font-extrabold text-[#231044]">
                Ask a group official
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Only you and assigned officials can read this conversation.
              </p>
            </div>
          </div>
          <form onSubmit={(event) => void startConversation(event)} className="grid gap-4">
            <FormError message={error} />
            <FormField htmlFor="member-message-title" label="Subject">
              <Input
                id="member-message-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={160}
                required
                placeholder="Payment record question"
              />
            </FormField>
            <FormField htmlFor="member-message-body" label="Message">
              <textarea
                id="member-message-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                minLength={1}
                maxLength={5000}
                required
                rows={5}
                className="w-full resize-y rounded-xl border border-indigo-100 bg-white/90 px-3.5 py-2.5 text-sm font-medium text-[#081233] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-indigo-200 focus:border-[#7B3FF2]/50 focus:bg-white focus:ring-4 focus:ring-[#7B3FF2]/10"
                placeholder="Describe what you need help with…"
              />
            </FormField>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6f25df] px-4 py-3 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-[#5d1ec2] disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" /> {pending ? 'Sending…' : 'Send to officials'}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] sm:p-6">
        <div className="mb-4">
          <h2 className="font-heading text-base font-extrabold text-[#231044]">
            {audience === 'member' ? 'My conversations' : 'Member conversations'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {audience === 'member'
              ? 'Private questions and replies from authorized officials.'
              : 'Only conversations assigned to you as an authorized official are shown.'}
          </p>
        </div>
        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading conversations…</p>
        ) : !data?.threads.length ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
            {audience === 'member'
              ? 'No conversations yet. Send a question and an authorized official can reply here.'
              : 'No member conversations are assigned to your account yet.'}
          </p>
        ) : (
          <div className="space-y-4">
            {data.threads.map((thread) => (
              <article key={thread.id} className="rounded-2xl border border-indigo-100/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-indigo-50 pb-3">
                  <h3 className="text-sm font-bold text-[#231044]">
                    {thread.title ?? 'Conversation with officials'}
                  </h3>
                  <span className="text-[9px] text-slate-400">
                    Started {formatDate(thread.created_at)}
                  </span>
                </div>
                <div className="space-y-3 py-3">
                  {thread.messages.map((message) => {
                    const ownMessage = message.sender_id === data.current_user_id
                    return (
                      <div
                        key={message.id}
                        className={`max-w-[92%] rounded-2xl px-3.5 py-3 ${ownMessage ? 'ml-auto bg-violet-50' : 'mr-auto bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-bold text-[#5a36ba]">
                            {ownMessage
                              ? 'You'
                              : audience === 'member'
                                ? 'group official'
                                : 'Member'}
                          </p>
                          <time className="text-[9px] text-slate-400">
                            {formatDate(message.created_at)}
                          </time>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                          {message.body}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <form
                  onSubmit={(event) => void reply(event, thread.id)}
                  className="flex items-end gap-2 border-t border-indigo-50 pt-3"
                >
                  <label className="sr-only" htmlFor={`reply-${thread.id}`}>
                    Reply to {thread.title ?? 'official conversation'}
                  </label>
                  <textarea
                    id={`reply-${thread.id}`}
                    value={replyDraft[thread.id] ?? ''}
                    onChange={(event) =>
                      setReplyDraft((current) => ({ ...current, [thread.id]: event.target.value }))
                    }
                    rows={2}
                    maxLength={5000}
                    required
                    placeholder="Write a reply…"
                    className="min-w-0 flex-1 resize-y rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs text-[#081233] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  />
                  <button
                    type="submit"
                    aria-label="Send reply"
                    disabled={replyPending === thread.id}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6f25df] text-white disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
