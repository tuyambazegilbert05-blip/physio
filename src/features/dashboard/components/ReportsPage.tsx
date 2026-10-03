'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { reportService } from '@/features/reports/services/report.service'
import { FinancialReport } from '@/features/reports/components/FinancialReport'
import { MemberReport } from '@/features/reports/components/MemberReport'
import { ReportActions } from '@/features/reports/components/ReportActions'
import { apiRequest } from '@/lib/api'
import type { GroupAccess } from '@/types/role'
import type { FinancialReportRow, MemberReportRow } from '@/types/report'

export function ReportsPage({ report }: { report: 'index' | 'financial' | 'members' }) {
  const { group, loading: groupLoading } = useActiveGroup()
  const [financial, setFinancial] = useState<FinancialReportRow[]>([])
  const [members, setMembers] = useState<MemberReportRow[]>([])
  const [access, setAccess] = useState<GroupAccess | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!group) return
    let active = true
    setAccess(null)
    setError('')
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then((snapshot) => { if (active) setAccess(snapshot) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load access permissions.') })
    return () => { active = false }
  }, [group])

  const canViewFinancial = Boolean(access?.permissions.includes('reports:read') && access.permissions.includes('financial:read'))
  const canViewMembers = Boolean(canViewFinancial && access?.permissions.includes('members:read'))

  useEffect(() => {
    if (!group || !access || report === 'index') return
    if ((report === 'financial' && !canViewFinancial) || (report === 'members' && !canViewMembers)) return
    let active = true
    setError('')
    if (report === 'financial') {
      reportService.financial(group.id)
        .then((rows) => { if (active) setFinancial(rows) })
        .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load report.') })
    } else {
      reportService.members(group.id)
        .then((rows) => { if (active) setMembers(rows) })
        .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load report.') })
    }
    return () => { active = false }
  }, [access, canViewFinancial, canViewMembers, group, report])

  if (groupLoading) return <p className="p-8">Loading group…</p>
  if (!group) return <p className="p-8">Create or join a group to view reports.</p>

  const safeGroupName = group.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
  if (report === 'index') {
    return <section className="mx-auto max-w-7xl space-y-5 p-6">
      <header><p className="text-sm text-slate-500">{group.name}</p><h1 className="text-2xl font-semibold">Reports</h1></header>
      {!access ? error ? <p role="alert" className="text-red-700">{error}</p> : <p role="status" className="text-sm text-slate-600">Loading access…</p> : <div className="grid gap-4 sm:grid-cols-2">
        {canViewFinancial && <Link className="rounded-xl border bg-white p-5 hover:border-indigo-300" href="/dashboard/reports/financial"><h2 className="font-semibold">Financial report</h2><p className="mt-2 text-sm text-slate-600">Monthly savings and social contributions, verified repayments, disbursed loans, expenses, share activity, and balances.</p></Link>}
        {canViewMembers && <Link className="rounded-xl border bg-white p-5 hover:border-indigo-300" href="/dashboard/reports/members"><h2 className="font-semibold">Member report</h2><p className="mt-2 text-sm text-slate-600">Contribution totals, outstanding disbursed loans, and meeting attendance.</p></Link>}
        {!canViewFinancial && <p className="text-sm text-slate-600">No reports are available to this account.</p>}
      </div>}
    </section>
  }

  const canView = report === 'financial' ? canViewFinancial : canViewMembers
  const title = report === 'financial' ? 'Financial report' : 'Member report'
  return <section className="mx-auto max-w-7xl space-y-5 p-6">
    <style jsx global>{`@media print { body * { visibility: hidden; } .report-print, .report-print * { visibility: visible; } .report-print { position: absolute; inset: 0; width: 100%; max-width: none; padding: 0 !important; } .report-actions { display: none !important; } }`}</style>
    <div className="report-print space-y-5">
      <header><p className="text-sm text-slate-500">{group.name}</p><h1 className="text-2xl font-semibold">{title}</h1></header>
      {!access ? error ? <p role="alert" className="text-red-700">{error}</p> : <p role="status" className="text-sm text-slate-600">Loading access…</p>
        : !canView ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">This account does not have permission to view this report.</p>
          : error ? <p role="alert" className="text-red-700">{error}</p>
            : report === 'financial' ? <>
              <ReportActions
                fileName={`${safeGroupName}-financial-report`}
                headers={['Period', 'Savings contributions', 'Social contributions', 'Repayments', 'Interest collected', 'Loans issued', 'Group expenses', 'Social-fund expenses', 'Social assistance', 'Social-fund balance', 'Net share activity', 'Closing available balance']}
                rows={financial.map((row) => [row.period, row.contributions, row.social_contributions, row.repayments, row.interest_collected, row.loans_issued, row.expenses, row.social_expenses, row.social_disbursements, row.social_fund_closing_balance, row.net_share_activity, row.closing_balance])}
              />
              <FinancialReport rows={financial} currency={group.currency} />
            </> : <>
              <ReportActions fileName={`${safeGroupName}-member-report`} headers={['Member', 'Contributions', 'Loans outstanding', 'Attendance rate (%)']} rows={members.map((row) => [row.full_name, row.contributions_total, row.loans_outstanding, row.attendance_rate])} />
              <MemberReport rows={members} currency={group.currency} />
            </>}
    </div>
  </section>
}
