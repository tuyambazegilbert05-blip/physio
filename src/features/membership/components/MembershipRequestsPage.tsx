'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Clock3, X } from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { GroupSelector } from '@/features/dashboard/components/GroupSelector'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import type { MembershipReviewRequest } from '@/features/membership/types'

export function MembershipRequestsPage() {
  const { groups, group, loading: groupsLoading, error: groupsError } = useActiveGroup()
  const [requests, setRequests] = useState<MembershipReviewRequest[]>([])
  const [loadedGroupId, setLoadedGroupId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const loading = Boolean(group && loadedGroupId !== group.id)

  const refresh = useCallback(async () => {
    if (!group) return
    try {
      const result = await apiRequest<{ requests: MembershipReviewRequest[] }>(
        `/api/membership/requests?group_id=${encodeURIComponent(group.id)}`,
      )
      setRequests(result.requests)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load membership requests.')
    } finally {
      setLoadedGroupId(group.id)
    }
  }, [group])

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<{ requests: MembershipReviewRequest[] }>(
      `/api/membership/requests?group_id=${encodeURIComponent(group.id)}`,
    )
      .then((result) => {
        if (!active) return
        setRequests(result.requests)
        setError('')
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to load membership requests.')
        }
      })
      .finally(() => {
        if (active) setLoadedGroupId(group.id)
      })
    return () => {
      active = false
    }
  }, [group])

  async function decide(requestId: string, decision: 'approved' | 'rejected') {
    setBusyId(requestId)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest<{ email_sent: boolean }>('/api/membership/requests', {
        method: 'PATCH',
        body: JSON.stringify({
          request_id: requestId,
          decision,
          message: messages[requestId] ?? '',
        }),
      })
      setNotice(
        result.email_sent
          ? decision === 'approved'
            ? 'Member access was granted and the applicant was notified.'
            : 'The request was declined and the applicant was notified.'
          : 'The decision was recorded. The in-app notification is available, but email delivery failed.',
      )
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the membership request.')
    } finally {
      setBusyId(null)
    }
  }

  if (groupsLoading) return <p className="p-8 text-sm text-slate-500">Loading group access…</p>
  if (!group)
    return (
      <p className="p-8 text-sm text-slate-500">No group workspace is available to this account.</p>
    )

  return (
    <>
      <DashboardHeader
        title="Membership requests"
        description={`${group.name} · Explicit review permission`}
      />
      <main className="mx-auto w-full max-w-[1180px] space-y-5 p-4 sm:space-y-6 sm:p-7 lg:p-8">
        <section className="rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-lg font-extrabold text-[#231044]">
                Review joining requests
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                Only users with the membership request review permission can approve or reject a
                request. Approval activates Member access only; additional roles remain separate.
              </p>
            </div>
            {groups.length > 1 && (
              <GroupSelector
                groups={groups}
                currentId={group.id}
                returnTo="/dashboard/membership-requests"
              />
            )}
          </div>
          {(groupsError || error) && (
            <div className="mt-4">
              <FormError message={error || groupsError} />
            </div>
          )}
          {notice && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-800"
            >
              {notice}
            </p>
          )}
          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="rounded-xl bg-slate-50 p-8 text-center text-xs text-slate-500">
                Loading pending requests…
              </p>
            ) : requests.length ? (
              requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-indigo-100/80 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-extrabold text-[#231044]">
                        {request.applicant_name || 'Applicant'}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.applicant_email || 'Email unavailable'} · Submitted{' '}
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                      <Clock3 className="h-3 w-3" />
                      Pending approval
                    </span>
                  </div>
                  {request.message && (
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                      {request.message}
                    </p>
                  )}
                  <label
                    className="mt-4 grid gap-2 text-[11px] font-bold text-slate-600"
                    htmlFor={`review-message-${request.id}`}
                  >
                    Optional message to applicant
                    <textarea
                      id={`review-message-${request.id}`}
                      value={messages[request.id] ?? ''}
                      onChange={(event) =>
                        setMessages((current) => ({ ...current, [request.id]: event.target.value }))
                      }
                      maxLength={1000}
                      rows={2}
                      className="w-full rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-xs font-normal outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void decide(request.id, 'approved')}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {busyId === request.id ? 'Saving…' : 'Approve membership'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void decide(request.id, 'rejected')}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject request
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-xl bg-slate-50 p-8 text-center text-xs text-slate-500">
                There are no pending requests for this group.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
