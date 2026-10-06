'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Check,
  Clock3,
  Compass,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { GroupForm } from '@/features/groups/components/GroupForm'
import { Modal } from '@/components/ui/Modal'
import { apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { persistActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import type { DiscoverableGroup, MembershipAccessData } from '@/features/membership/types'

function stateTitle(status: string) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Not approved'
  if (status === 'withdrawn') return 'Withdrawn'
  return 'Pending approval'
}

export function AccountAccessHome() {
  const router = useRouter()
  const [data, setData] = useState<MembershipAccessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<DiscoverableGroup | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const accessDataRef = useRef<MembershipAccessData | null>(null)
  const activationRedirectRef = useRef(false)

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const nextData = await apiRequest<MembershipAccessData>('/api/membership/requests')
      const previousData = accessDataRef.current
      accessDataRef.current = nextData
      setData(nextData)

      const newlyApproved = nextData.requests.find(
        (request) =>
          request.status === 'approved' &&
          previousData?.requests.some(
            (previous) => previous.id === request.id && previous.status === 'pending',
          ),
      )
      if (newlyApproved && !activationRedirectRef.current) {
        activationRedirectRef.current = true
        persistActiveGroup(newlyApproved.group_id)
        router.replace(`/dashboard?group=${encodeURIComponent(newlyApproved.group_id)}`)
        router.refresh()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your membership status.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [router])

  useEffect(() => {
    let active = true
    apiRequest<MembershipAccessData>('/api/membership/requests')
      .then((membershipData) => {
        if (!active) return
        accessDataRef.current = membershipData
        setData(membershipData)
        setError('')
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Unable to load your membership status.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const refreshOnFocus = () => void refresh(false)
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      active = false
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [refresh])

  const hasPendingRequest = data?.requests.some((request) => request.status === 'pending') ?? false

  useEffect(() => {
    if (!hasPendingRequest) return
    const interval = window.setInterval(() => void refresh(false), 15_000)
    return () => window.clearInterval(interval)
  }, [hasPendingRequest, refresh])

  const pendingGroupIds = new Set(
    (data?.requests ?? [])
      .filter((request) => request.status === 'pending')
      .map((request) => request.group_id),
  )

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      await apiRequest('/api/membership/requests', {
        method: 'POST',
        body: JSON.stringify({ group_id: selected.id, message }),
      })
      setSelected(null)
      setMessage('')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit your membership request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DashboardHeader
        title="Join a group"
        description="Your platform account is separate from group membership."
      />
      <main className="mx-auto w-full max-w-[1180px] space-y-5 p-4 sm:space-y-6 sm:p-7 lg:p-8">
        <section className="rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-[0_22px_60px_-40px_rgba(36,55,245,0.45)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Email verified
              </p>
              <h1 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-[#231044] sm:text-3xl">
                {data?.profile.full_name
                  ? `Welcome, ${data.profile.full_name}`
                  : 'Choose a group to request membership'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {data?.profile.email ?? 'Loading your account…'}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-xs text-violet-900">
              <p className="font-bold">Membership requires approval</p>
              <p className="mt-1 max-w-sm leading-relaxed text-violet-800/75">
                Creating an account or selecting a group does not grant access to its member area or
                financial information.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-4">
            {[
              ['Account created', true],
              ['Email verified', true],
              ['Group selected', Boolean(data?.requests.length)],
              [
                'Membership approved',
                data?.requests.some((request) => request.status === 'approved') ?? false,
              ],
            ].map(([label, complete], index) => (
              <div
                key={String(label)}
                className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-600"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                {label}
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <FormError message={error} />
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Try again
            </button>
          </div>
        )}

        {(data?.requests ?? []).length > 0 && (
          <section className="rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-heading text-base font-extrabold text-[#231044]">
                    Your membership requests
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Your access stays restricted until approval. We check for updates while this
                    page is open and take you to your Member dashboard when access is granted.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh status
              </button>
            </div>
            <div className="space-y-3">
              {data?.requests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-indigo-100/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#231044]">{request.group_name}</h3>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Submitted {formatDate(request.created_at)}
                        {request.reviewed_at ? ` · Updated ${formatDate(request.reviewed_at)}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}
                    >
                      {stateTitle(request.status)}
                    </span>
                  </div>
                  {request.status === 'pending' && (
                    <p className="mt-3 rounded-xl bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      Your request is waiting for the group’s authorized reviewers. You cannot
                      access its member dashboard or records yet.
                    </p>
                  )}
                  {request.status === 'rejected' && (
                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                      This request was not approved. You can review other available groups or submit
                      a new request if the group is open for joining.
                      {request.decision_message ? ` Message: ${request.decision_message}` : ''}
                    </p>
                  )}
                  {request.status === 'approved' && (
                    <div className="mt-3 flex flex-col items-start gap-3 rounded-xl bg-emerald-50 px-3 py-3 text-xs text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
                      <p className="leading-relaxed">
                        You are now a Member. Your personal Member dashboard and onboarding guide
                        are available.
                      </p>
                      <Link
                        href={`/dashboard?group=${encodeURIComponent(request.group_id)}`}
                        onClick={() => persistActiveGroup(request.group_id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white transition hover:bg-emerald-800"
                      >
                        Open Member dashboard
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-extrabold text-[#231044]">
                Available groups
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Only public group details are shown before membership approval.
              </p>
            </div>
            <Compass className="h-5 w-5 text-[#7B3FF2]" />
          </div>
          {loading ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-xs text-slate-500">
              Loading available groups…
            </p>
          ) : error && !data ? (
            <p
              role="status"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-xs leading-relaxed text-amber-900"
            >
              Available groups could not be loaded. Retry the request above to check your
              membership status and try again.
            </p>
          ) : data?.groups.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.groups.map((group) => (
                <article
                  key={group.id}
                  className="rounded-2xl border border-indigo-100/80 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-sm font-extrabold text-[#231044]">
                        {group.name}
                      </h3>
                      {group.location && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {group.location}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-bold uppercase text-violet-700">
                      {group.contribution_frequency}
                    </span>
                  </div>
                  <p className="mt-3 min-h-10 text-xs leading-relaxed text-slate-600">
                    {group.description || 'This group has not added a public description yet.'}
                  </p>
                  <button
                    type="button"
                    disabled={pendingGroupIds.has(group.id)}
                    onClick={() => setSelected(group)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#6f25df] px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:bg-[#5d1ec2] disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {pendingGroupIds.has(group.id) ? 'Request pending' : 'Review group and request'}
                    {!pendingGroupIds.has(group.id) && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-xs text-slate-500">
              No public groups are currently available to join.
            </p>
          )}
        </section>

        <section className="rounded-[22px] border border-indigo-100/80 bg-white/70 p-4">
          <button
            type="button"
            onClick={() => setCreateGroupOpen((open) => !open)}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#5934bd]"
          >
            <Plus className="h-4 w-4" /> Start a new group
          </button>
          {createGroupOpen && (
            <div className="mt-3 max-w-2xl">
              <p className="mb-4 text-xs leading-relaxed text-slate-500">
                Creating a new group is a separate action. The creator becomes its founding Member
                and Chairperson; other privileged roles are not assigned automatically.
              </p>
              <GroupForm />
            </div>
          )}
        </section>
      </main>

      <Modal open={Boolean(selected)} title="Review this group" onClose={() => setSelected(null)}>
        {selected && (
          <form onSubmit={(event) => void submitRequest(event)} className="grid gap-4">
            <div className="rounded-2xl bg-violet-50/70 p-4">
              <h2 className="font-heading text-lg font-extrabold text-[#231044]">
                {selected.name}
              </h2>
              {selected.location && (
                <p className="mt-1 text-xs text-slate-500">{selected.location}</p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {selected.description || 'No public description has been provided.'}
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                {selected.contribution_frequency} contributions · {selected.currency}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Selecting this group does not make you a Member. Submitting creates a request that
              authorized reviewers must approve.
            </p>
            <FormField
              htmlFor="membership-request-message"
              label="Message to reviewers"
              hint="Optional. Share why you would like to join."
            >
              <textarea
                id="membership-request-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full rounded-xl border border-indigo-100 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#7B3FF2]/50 focus:ring-4 focus:ring-[#7B3FF2]/10"
              />
            </FormField>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#6f25df] px-4 py-3 text-xs font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'Submitting request…' : 'Submit membership request'}
            </button>
          </form>
        )}
      </Modal>
    </>
  )
}
