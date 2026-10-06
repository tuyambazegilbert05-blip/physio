'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MailPlus, RefreshCw, ShieldCheck, UserRound, X } from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { GroupSelector } from '@/features/dashboard/components/GroupSelector'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { Input } from '@/components/ui/Input'

type Invitation = {
  id: string
  email: string
  invitee_name: string | null
  status: 'pending' | 'sent' | 'delivery_failed' | 'accepted' | 'declined' | 'expired' | 'revoked'
  expires_at: string
  created_at: string
  sent_at: string | null
  accepted_at: string | null
  declined_at: string | null
  revoked_at: string | null
  last_delivery_attempt_at: string | null
  inviter_name: string
}

const statusStyles: Record<Invitation['status'], string> = {
  pending: 'bg-amber-50 text-amber-800',
  sent: 'bg-blue-50 text-blue-800',
  delivery_failed: 'bg-rose-50 text-rose-700',
  accepted: 'bg-emerald-50 text-emerald-800',
  declined: 'bg-slate-100 text-slate-600',
  expired: 'bg-orange-50 text-orange-800',
  revoked: 'bg-slate-100 text-slate-500',
}

const statusLabels: Record<Invitation['status'], string> = {
  pending: 'Sending', sent: 'Pending', delivery_failed: 'Delivery failed', accepted: 'Accepted',
  declined: 'Declined', expired: 'Expired', revoked: 'Revoked',
}

export function GroupInvitationsPage() {
  const { groups, group, loading: groupsLoading, error: groupsError } = useActiveGroup()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadedGroupId, setLoadedGroupId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteeName, setInviteeName] = useState('')
  const [busyId, setBusyId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const loading = Boolean(group && loadedGroupId !== group.id)

  const refresh = useCallback(async () => {
    if (!group) return
    try {
      const result = await apiRequest<{ invitations: Invitation[] }>(
        `/api/invitations?group_id=${encodeURIComponent(group.id)}`,
      )
      setInvitations(result.invitations)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load invitations.')
    } finally {
      setLoadedGroupId(group.id)
    }
  }, [group])

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<{ invitations: Invitation[] }>(`/api/invitations?group_id=${encodeURIComponent(group.id)}`)
      .then((result) => { if (active) { setInvitations(result.invitations); setError('') } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load invitations.') })
      .finally(() => { if (active) setLoadedGroupId(group.id) })
    return () => { active = false }
  }, [group])

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!group) return
    setSubmitting(true); setError(''); setNotice('')
    try {
      const result = await apiRequest<{ email_sent: boolean; message: string }>('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({ group_id: group.id, email, invitee_name: inviteeName || null }),
      })
      setNotice(result.message)
      setEmail(''); setInviteeName('')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The invitation could not be sent.')
    } finally { setSubmitting(false) }
  }

  async function updateInvitation(invitationId: string, action: 'resend' | 'revoke') {
    setBusyId(invitationId); setError(''); setNotice('')
    try {
      const result = await apiRequest<{ email_sent?: boolean; message?: string; status?: string }>('/api/invitations', {
        method: 'PATCH', body: JSON.stringify({ invitation_id: invitationId, action }),
      })
      setNotice(result.message ?? 'Invitation revoked.')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The invitation could not be updated.')
    } finally { setBusyId('') }
  }

  if (groupsLoading) return <p className="p-8 text-sm text-slate-500">Loading group access…</p>
  if (!group) return <p className="p-8 text-sm text-slate-500">No group workspace is available to this account.</p>

  return (
    <>
      <DashboardHeader title="Group invitations" description={`${group.name} · Permission-controlled member invitations`} />
      <main className="mx-auto w-full max-w-[1180px] space-y-5 p-4 sm:space-y-6 sm:p-7 lg:p-8">
        <section className="rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700"><ShieldCheck className="h-4 w-4" /> Authorized invitations</p>
              <h1 className="mt-2 font-heading text-lg font-extrabold text-[#231044]">Invite a person to this group</h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Only people with the group’s explicit invitation permission can send or manage invitations. Acceptance grants Member access only.</p>
            </div>
            {groups.length > 1 && <GroupSelector groups={groups} currentId={group.id} returnTo="/dashboard/invitations" />}
          </div>
          {(groupsError || error) && <div className="mt-4"><FormError message={error || groupsError} /></div>}
          {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-800">{notice}</p>}

          <form onSubmit={createInvitation} className="mt-5 grid gap-4 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5">
            <FormField htmlFor="invite-email" label="Invitee email">
              <Input id="invite-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" maxLength={254} required />
            </FormField>
            <FormField htmlFor="invite-name" label="Name (optional)">
              <Input id="invite-name" value={inviteeName} onChange={(event) => setInviteeName(event.target.value)} autoComplete="name" maxLength={120} placeholder="Invitee name" />
            </FormField>
            <FormSubmit pending={submitting}><span className="inline-flex items-center gap-2"><MailPlus className="h-4 w-4" /> Send invite</span></FormSubmit>
          </form>
        </section>

        <section className="rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-heading text-lg font-extrabold text-[#231044]">Invitation history</h2><p className="mt-1 text-xs text-slate-500">Links expire after seven days. Resending invalidates the previous link.</p></div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">{invitations.length} records</span>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? <p className="rounded-xl bg-slate-50 p-8 text-center text-xs text-slate-500">Loading invitations…</p> : invitations.length ? invitations.map((invitation) => {
              const canResend = ['pending', 'sent', 'delivery_failed', 'expired'].includes(invitation.status)
              const canRevoke = ['pending', 'sent', 'delivery_failed'].includes(invitation.status)
              return (
                <article key={invitation.id} className="flex flex-col gap-4 rounded-2xl border border-indigo-100/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-extrabold text-[#231044]">{invitation.invitee_name || invitation.email}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[invitation.status]}`}>{statusLabels[invitation.status]}</span>
                    </div>
                    {invitation.invitee_name && <p className="mt-1 text-xs text-slate-500">{invitation.email}</p>}
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> Invited by {invitation.inviter_name}</span><span>Created {formatDate(invitation.created_at)}</span><span>Expires {formatDate(invitation.expires_at)}</span></p>
                    {invitation.accepted_at && <p className="mt-1 text-[11px] font-semibold text-emerald-700">Accepted {formatDate(invitation.accepted_at)}</p>}
                    {invitation.declined_at && <p className="mt-1 text-[11px] text-slate-500">Declined {formatDate(invitation.declined_at)}</p>}
                  </div>
                  {(canResend || canRevoke) && <div className="flex shrink-0 flex-wrap gap-2">
                    {canResend && <button type="button" disabled={Boolean(busyId)} onClick={() => void updateInvitation(invitation.id, 'resend')} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busyId === invitation.id ? 'animate-spin' : ''}`} /> Resend</button>}
                    {canRevoke && <button type="button" disabled={Boolean(busyId)} onClick={() => void updateInvitation(invitation.id, 'revoke')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Revoke</button>}
                  </div>}
                </article>
              )
            }) : <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 p-8 text-center"><MailPlus className="mx-auto h-6 w-6 text-violet-500" /><p className="mt-2 text-sm font-bold text-[#231044]">No invitations yet</p><p className="mt-1 text-xs text-slate-500">Invitations you send to this group will appear here.</p></div>}
          </div>
        </section>
      </main>
    </>
  )
}
