'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Bell, Megaphone, Send } from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import type { GroupAccess } from '@/types/role'

type Announcement = {
  id: string
  group_id: string
  title: string
  body: string
  published_at: string | null
  created_at: string
}

export function AnnouncementsPage() {
  const { group, loading: groupLoading, error: groupError } = useActiveGroup()
  const [state, setState] = useState<{
    groupId: string
    loading: boolean
    canManage: boolean
    items: Announcement[]
    error: string
  } | null>(null)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const current = group && state?.groupId === group.id ? state : null

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then(async (access) => {
        const canManage = access.permissions.includes('announcements:manage')
        if (!canManage) {
          if (active) setState({ groupId: group.id, loading: false, canManage: false, items: [], error: '' })
          return
        }
        const items = await apiRequest<Announcement[]>(`/api/announcements?group_id=${encodeURIComponent(group.id)}`)
        if (active) setState({ groupId: group.id, loading: false, canManage: true, items, error: '' })
      })
      .catch((cause: unknown) => {
        if (active) setState({ groupId: group.id, loading: false, canManage: false, items: [], error: cause instanceof Error ? cause.message : 'Announcements could not be loaded.' })
      })
    return () => { active = false }
  }, [group, reloadKey])

  async function createAnnouncement(event: FormEvent<HTMLFormElement>, publish: boolean) {
    event.preventDefault()
    if (!group || !current?.canManage) return
    const form = event.currentTarget
    const values = new FormData(form)
    setSending(true)
    setFormError('')
    setNotice('')
    try {
      const item = await apiRequest<Announcement>('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          group_id: group.id,
          title: String(values.get('title') ?? ''),
          body: String(values.get('body') ?? ''),
          publish,
        }),
      })
      setState((existing) => existing?.groupId === group.id
        ? { ...existing, items: [item, ...existing.items] }
        : existing)
      form.reset()
      setNotice(publish ? 'Announcement published to this group.' : 'Announcement saved as a draft.')
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'The announcement could not be saved.')
    } finally {
      setSending(false)
    }
  }

  async function publishDraft(item: Announcement) {
    if (!group || !current?.canManage) return
    setSending(true)
    setFormError('')
    setNotice('')
    try {
      const published = await apiRequest<Announcement>('/api/announcements', {
        method: 'PATCH',
        body: JSON.stringify({ group_id: group.id, announcement_id: item.id }),
      })
      setState((existing) => existing?.groupId === group.id
        ? { ...existing, items: existing.items.map((entry) => entry.id === item.id ? published : entry) }
        : existing)
      setNotice('Draft published to this group.')
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'The draft could not be published.')
    } finally {
      setSending(false)
    }
  }

  if (groupLoading) return <p role="status" className="p-6 text-sm text-slate-500">Loading group communications…</p>
  if (groupError) return <p role="alert" className="m-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{groupError}</p>
  if (!group) return <p className="p-6 text-sm text-slate-500">No group is available.</p>

  return (
    <>
      <DashboardHeader title="Announcements" description={`${group.name} · Official group notices`} />
      <main className="mx-auto w-full max-w-[1200px] space-y-5 p-4 sm:p-7 lg:p-8">
        {!current || current.loading ? (
          <p role="status" className="rounded-xl border border-indigo-100 bg-white p-4 text-sm text-slate-500">Loading announcement access…</p>
        ) : current.error ? (
          <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><h2 className="font-heading text-base font-extrabold text-rose-950">Announcements could not be loaded</h2><p className="mt-1.5 text-sm text-rose-900/80">{current.error}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-3 rounded-lg bg-rose-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-950">Try again</button></section>
        ) : !current.canManage ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-heading text-base font-extrabold text-amber-950">Announcement access denied</h2><p className="mt-1 text-sm text-amber-900/80">Publishing group-wide notices requires the explicit announcements:manage permission.</p></section>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-2xl border border-indigo-100/80 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(36,55,245,0.55)] sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-indigo-50 pb-4"><span className="rounded-xl bg-violet-50 p-2 text-violet-800"><Megaphone className="h-4 w-4" /></span><div><p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-violet-700">Group communication</p><h2 className="font-heading text-base font-extrabold text-[#081233]">Create an announcement</h2></div></div>
              <form onSubmit={(event) => { const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; void createAnnouncement(event, submitter?.value === 'publish') }} className="grid gap-4">
                <FormError message={formError} />
                {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{notice}</p>}
                <FormField htmlFor="announcement-title" label="Title"><Input id="announcement-title" name="title" minLength={3} maxLength={160} required /></FormField>
                <FormField htmlFor="announcement-body" label="Message" hint="Visible to members of this group after publication."><textarea id="announcement-body" name="body" required maxLength={5000} rows={7} className="w-full rounded-xl border border-indigo-100 bg-white px-3.5 py-3 text-sm leading-relaxed text-[#081233] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /></FormField>
                <div className="flex flex-wrap gap-2">
                  <FormSubmit pending={sending} name="intent" value="draft" className="bg-slate-700 shadow-none hover:bg-slate-800">Save draft</FormSubmit>
                  <FormSubmit pending={sending} name="intent" value="publish" className="inline-flex items-center gap-2"><Send className="h-4 w-4" />Publish</FormSubmit>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-indigo-100/80 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(36,55,245,0.55)] sm:p-6">
              <div className="mb-4 flex items-center gap-3 border-b border-indigo-50 pb-4"><span className="rounded-xl bg-indigo-50 p-2 text-indigo-800"><Bell className="h-4 w-4" /></span><div><p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-indigo-700">This group only</p><h2 className="font-heading text-base font-extrabold text-[#081233]">Communication history</h2></div></div>
              {current.items.length ? <ul className="space-y-3">{current.items.map((item) => <li key={item.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-sm font-bold text-[#081233]">{item.title}</h3><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${item.published_at ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.published_at ? 'Published' : 'Draft'}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{item.body}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-slate-400">{item.published_at ? `Published ${formatDate(item.published_at)}` : `Draft created ${formatDate(item.created_at)}`}</p>{!item.published_at && <button type="button" disabled={sending} onClick={() => void publishDraft(item)} className="rounded-lg bg-violet-700 px-3 py-2 text-[10px] font-bold text-white hover:bg-violet-800 disabled:opacity-60">Publish draft</button>}</div></li>)}</ul> : <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-8 text-center"><Megaphone className="mx-auto h-5 w-5 text-violet-700" /><h3 className="mt-2 text-xs font-bold text-[#081233]">No announcements yet</h3><p className="mt-1 text-[11px] text-slate-500">Drafts and published notices for this group will appear here.</p></div>}
            </section>
          </div>
        )}
      </main>
    </>
  )
}
