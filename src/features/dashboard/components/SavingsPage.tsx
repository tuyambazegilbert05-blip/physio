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
  const { group, loading } = useActiveGroup()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [personal, setPersonal] = useState<{ contributions: number; loans: number } | null>(null)
  const [access, setAccess] = useState<GroupAccess | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!group) return
    let active = true
    setError(''); setSummary(null); setPersonal(null); setAccess(null)
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`).then(async (snapshot) => {
      if (!active) return
      setAccess(snapshot)
      if (snapshot.permissions.includes('financial:read')) {
        const groupSummary = await savingsService.summary(group.id)
        if (active) setSummary(groupSummary)
      } else if (snapshot.is_member) {
        const [contributions, loans] = await Promise.all([
          apiRequest<Contribution[]>(`/api/contributions?group_id=${encodeURIComponent(group.id)}`),
          apiRequest<Loan[]>(`/api/loans?group_id=${encodeURIComponent(group.id)}`),
        ])
        if (!active) return
        setPersonal({
          contributions: contributions.filter((item) => item.status === 'verified' && item.contribution_type !== 'social').reduce((total, item) => total + item.amount, 0),
          loans: loans.filter((item) => item.status === 'approved' || item.status === 'active' || item.status === 'defaulted').reduce((total, item) => total + item.outstanding_amount, 0),
        })
      }
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load savings information.') })
    return () => { active = false }
  }, [group])
  if (loading) return <p className="p-8">Loading group…</p>
  if (!group) return <p className="p-8">Create or join a savings group to see its balance.</p>
  if (error) return <p role="alert" className="p-8 text-red-700">{error}</p>
  if (!access) return <p className="p-8">Loading savings access…</p>
  if (!access.permissions.includes('financial:read') && !access.is_member) return <section className="mx-auto max-w-3xl space-y-3 p-6"><p className="text-sm text-slate-500">{group.name}</p><h1 className="text-2xl font-semibold">Savings</h1><p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">This account does not have permission to view savings records.</p></section>
  if (summary) return <section className="mx-auto max-w-7xl space-y-6 p-6"><div><p className="text-sm text-slate-500">{group.name}</p><h1 className="text-2xl font-semibold">Group savings</h1></div><SavingsSummary summary={summary} /><div className="rounded-xl border border-slate-200 bg-white p-5"><SavingsChart values={[{ month: 'Current', balance: summary.available_balance }]} /></div></section>
  if (!personal) return <p className="p-8">Loading savings information…</p>
  const personalBalance = personal.contributions - personal.loans
  return <section className="mx-auto max-w-7xl space-y-6 p-6"><div><p className="text-sm text-slate-500">{group.name}</p><h1 className="text-2xl font-semibold">Your savings</h1><p className="mt-1 text-sm text-slate-600">These figures include only your verified savings contributions and your outstanding loans.</p></div><dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-5"><dt className="text-sm text-slate-500">Your verified savings contributions</dt><dd className="mt-2 text-xl font-semibold">{formatMoney(personal.contributions, group.currency)}</dd></div><div className="rounded-xl border border-slate-200 bg-white p-5"><dt className="text-sm text-slate-500">Your outstanding loan balance</dt><dd className="mt-2 text-xl font-semibold">{formatMoney(personal.loans, group.currency)}</dd></div></dl><div className="rounded-xl border border-slate-200 bg-white p-5"><SavingsChart values={[{ month: 'Current', balance: personalBalance }]} /></div></section>
}
