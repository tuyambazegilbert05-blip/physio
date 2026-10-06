'use client'

import { useEffect, useState } from 'react'
import { SavingsSummary } from '@/features/savings/components/SavingsSummary'
import { SavingsChart } from '@/features/savings/components/SavingsChart'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { savingsService } from '@/features/savings/services/savings.service'
import { apiRequest } from '@/lib/api'
import { formatMoney } from '@/lib/formatters'
import type { SavingsSummary as Summary } from '@/types/savings'
import type { GroupAccess } from '@/types/role'
import type { Contribution } from '@/types/contribution'
import type { Loan } from '@/types/loan'

export function SavingsPage() {
  const { group, loading: groupLoading } = useActiveGroup()
  const [workspace, setWorkspace] = useState<{
    groupId: string
    summary: Summary | null
    personal: { contributions: number; loans: number } | null
    access: GroupAccess
  } | null>(null)
  const [errorState, setErrorState] = useState<{ groupId: string; message: string } | null>(null)
  const currentWorkspace = group && workspace?.groupId === group.id ? workspace : null
  const summary = currentWorkspace?.summary ?? null
  const personal = currentWorkspace?.personal ?? null
  const access = currentWorkspace?.access ?? null
  const error = group && errorState?.groupId === group.id ? errorState.message : ''
  const loading = groupLoading || Boolean(group && !currentWorkspace && !error)

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then(async (snapshot) => {
        if (!active) return
        let nextSummary: Summary | null = null
        let nextPersonal: { contributions: number; loans: number } | null = null
        if (snapshot.permissions.includes('financial:read')) {
          nextSummary = await savingsService.summary(group.id)
        } else if (snapshot.is_member) {
          const [contributions, loans] = await Promise.all([
            apiRequest<Contribution[]>(
              `/api/contributions?group_id=${encodeURIComponent(group.id)}`,
            ),
            apiRequest<Loan[]>(`/api/loans?group_id=${encodeURIComponent(group.id)}`),
          ])
          if (!active) return
          nextPersonal = {
            contributions: contributions
              .filter((item) => item.status === 'verified' && item.contribution_type !== 'social')
              .reduce((total, item) => total + item.amount, 0),
            loans: loans
              .filter(
                (item) =>
                  item.status === 'approved' ||
                  item.status === 'active' ||
                  item.status === 'defaulted',
              )
              .reduce((total, item) => total + item.outstanding_amount, 0),
          }
        }
        if (active)
          setWorkspace({
            groupId: group.id,
            summary: nextSummary,
            personal: nextPersonal,
            access: snapshot,
          })
      })
      .catch((reason: unknown) => {
        if (active)
          setErrorState({
            groupId: group.id,
            message: reason instanceof Error ? reason.message : 'Unable to load savings information.',
          })
      })
    return () => {
      active = false
    }
  }, [group])
  if (loading) return <p className="p-8">Loading group…</p>
  if (!group) return <p className="p-8">Create or join a savings group to see its balance.</p>
  if (error)
    return (
      <p role="alert" className="p-8 text-red-700">
        {error}
      </p>
    )
  if (!access) return <p className="p-8">Loading savings access…</p>
  if (!access.permissions.includes('financial:read') && !access.is_member)
    return (
      <section className="mx-auto max-w-[1500px] space-y-4 p-5 sm:p-8">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
          {group.name}
        </p>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#081233]">
          Savings
        </h1>
        <p className="rounded-[22px] border border-indigo-100 bg-white/85 p-5 text-sm leading-relaxed text-slate-600 shadow-sm">
          This account does not have permission to view savings records.
        </p>
      </section>
    )
  if (summary)
    return (
      <section className="mx-auto w-full max-w-[1500px] space-y-6 p-5 sm:space-y-8 sm:p-8">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
            {group.name}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
            Group savings
          </h1>
        </div>
        <SavingsSummary summary={summary} />
        <div className="rounded-[28px] border border-white/90 bg-white/88 p-5 shadow-[0_20px_56px_-40px_rgba(36,55,245,0.55)] backdrop-blur-xl sm:p-6">
          <SavingsChart values={[{ month: 'Current', balance: summary.available_balance }]} />
        </div>
      </section>
    )
  if (!personal) return <p className="p-8">Loading savings information…</p>
  const personalBalance = personal.contributions - personal.loans
  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-5 sm:space-y-8 sm:p-8">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
          {group.name}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
          Your savings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          These figures include only your verified savings contributions and your outstanding loans.
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] border border-white bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.45)]">
          <dt className="text-sm text-slate-500">Your verified savings contributions</dt>
          <dd className="mt-2 text-xl font-semibold">
            {formatMoney(personal.contributions, group.currency)}
          </dd>
        </div>
        <div className="rounded-[24px] border border-white bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.45)]">
          <dt className="text-sm text-slate-500">Your outstanding loan balance</dt>
          <dd className="mt-2 text-xl font-semibold">
            {formatMoney(personal.loans, group.currency)}
          </dd>
        </div>
      </dl>
      <div className="rounded-[28px] border border-white/90 bg-white/88 p-5 shadow-[0_20px_56px_-40px_rgba(36,55,245,0.55)] backdrop-blur-xl sm:p-6">
        <SavingsChart values={[{ month: 'Current', balance: personalBalance }]} />
      </div>
    </section>
  )
}
