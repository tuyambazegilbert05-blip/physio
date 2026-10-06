'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Check, CircleAlert, Clock3, RefreshCw, Wrench } from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'

type Diagnostics = {
  checkedAt: string
  group: { id: string; name: string } | null
  checks: { key: string; label: string; ok: boolean; durationMs: number }[]
  controls: {
    status: 'normal' | 'limited' | 'maintenance' | 'locked'
    disabledModules: string[]
    updatedAt: string | null
  } | null
}

const moduleNames: Record<string, string> = {
  member_registration: 'Member registration',
  technical_access: 'Technical access',
  contributions: 'Contributions',
  shares: 'Shares',
  loan_requests: 'Loan requests',
  loan_approvals: 'Loan approvals',
  loan_repayments: 'Loan repayments',
  social_fund: 'Social fund',
  profit_distribution: 'Profit distribution',
  expenses: 'Expenses',
  reconciliation: 'Reconciliation',
  savings_cycles: 'Savings cycles',
  meetings: 'Meetings',
  announcements: 'Announcements',
  chat: 'Chat',
}

export function TechnicalSupportWorkspace({ preferredGroupId }: { preferredGroupId?: string }) {
  const { group, loading: groupLoading, error: groupError } = useActiveGroup(preferredGroupId)
  const [snapshot, setSnapshot] = useState<{ groupId: string; data: Diagnostics } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const data = group && snapshot?.groupId === group.id ? snapshot.data : null

  const refresh = useCallback(async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest<Diagnostics>(
        `/api/system/diagnostics?group_id=${encodeURIComponent(group.id)}`,
        { cache: 'no-store' },
      )
      setSnapshot({ groupId: group.id, data: result })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Diagnostics could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [group])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  if (groupLoading)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Loading technical workspace…
      </p>
    )
  if (groupError)
    return (
      <p role="alert" className="m-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {groupError}
      </p>
    )
  if (!group)
    return (
      <main className="p-5">
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No Ikimina with technical access is available.
        </p>
      </main>
    )

  const allChecksPassed = Boolean(data?.checks.length && data.checks.every((check) => check.ok))

  return (
    <>
      <DashboardHeader
        title="Technical support"
        description={`${group.name} · read-only diagnostics`}
      />
      <main className="mx-auto w-full max-w-[1100px] space-y-5 p-4 sm:p-7 lg:p-8">
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-700">
              <Wrench className="h-4 w-4" />
              Support workspace
            </p>
            <h1 className="mt-2 font-heading text-2xl font-extrabold text-slate-950">
              {group.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Review application reachability and the group’s current operational state. Diagnostics
              return status and response time only; member and financial records are not included.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-bold text-violet-800 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking…' : 'Run diagnostics'}
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <CircleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {!data && !error && (
          <p
            role="status"
            className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500"
          >
            Checking group access and operational controls…
          </p>
        )}

        {data && (
          <>
            <section aria-label="Diagnostic status" className="grid gap-3 sm:grid-cols-2">
              {data.checks.map((check) => (
                <article
                  key={check.key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-sm font-extrabold text-slate-900">
                        {check.label}
                      </h2>
                      <p className="mt-2 text-xs text-slate-500">
                        {check.ok ? 'Responding normally' : 'Could not confirm access'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${check.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                    >
                      {check.ok ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <CircleAlert className="h-3.5 w-3.5" />
                      )}
                      {check.ok ? 'Available' : 'Check needed'}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    Response time <strong className="text-slate-700">{check.durationMs} ms</strong>
                  </div>
                </article>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-violet-50 p-2 text-violet-700">
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-heading text-base font-extrabold text-slate-900">
                    Operational state
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {data.checkedAt
                      ? `Checked ${new Date(data.checkedAt).toLocaleString()}`
                      : 'Waiting for first check'}
                  </p>
                </div>
              </div>
              {data.controls ? (
                <>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold capitalize text-slate-800">
                      {data.controls.status}
                    </span>
                    <span className="text-sm text-slate-600">
                      {data.controls.disabledModules.length} module
                      {data.controls.disabledModules.length === 1 ? '' : 's'} restricted
                    </span>
                    {data.controls.updatedAt && (
                      <span className="text-xs text-slate-500">
                        Controls updated {new Date(data.controls.updatedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {data.controls.disabledModules.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Restricted modules">
                      {data.controls.disabledModules.map((key) => (
                        <li
                          key={key}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
                        >
                          {moduleNames[key] ?? key}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  The operational controls could not be confirmed. Retry diagnostics or contact a
                  system administrator.
                </p>
              )}
              <p className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span
                  className={`h-2 w-2 rounded-full ${allChecksPassed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                {allChecksPassed
                  ? 'All available checks responded.'
                  : 'At least one check needs attention.'}
              </p>
            </section>
          </>
        )}
      </main>
    </>
  )
}
