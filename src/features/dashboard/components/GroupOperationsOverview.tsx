import Link from 'next/link'
import { Activity, ArrowRight, CalendarDays } from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import {
  GroupAnalyticsBoard,
  type GroupAnalyticsData,
  type GroupFlowPeriod,
  type GroupPaymentMatrix,
  type PaymentMatrixCell,
} from '@/features/dashboard/components/GroupAnalyticsBoard'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatMoney } from '@/lib/formatters'
import { hasAnyPermission, hasGroupWorkspaceAccess } from '@/lib/group-workspace-access'
import type { Group } from '@/types/group'

type Props = {
  group: Pick<Group, 'id' | 'name' | 'currency' | 'contribution_frequency'>
  permissions: string[]
}

function WorkspaceSection({
  eyebrow,
  title,
  children,
  href,
  linkLabel,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
  href?: string
  linkLabel?: string
}) {
  return (
    <section className="rounded-2xl border border-indigo-100/80 bg-white p-4 shadow-[0_16px_38px_-32px_rgba(36,55,245,0.55)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-violet-700">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-heading text-base font-extrabold text-[#081233] sm:text-lg">
            {title}
          </h2>
        </div>
        {href && linkLabel && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-600">
      {children}
    </p>
  )
}

export async function GroupOperationsOverview({ group, permissions }: Props) {
  const can = (...items: string[]) => hasAnyPermission(permissions, ...items)
  if (!hasGroupWorkspaceAccess(permissions)) {
    return (
      <>
        <DashboardHeader title="Manage Ikimina" description={`${group.name} · Access restricted`} />
        <main className="mx-auto max-w-4xl p-5 sm:p-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
            <h2 className="font-heading text-lg font-extrabold text-amber-950">
              Management access is not assigned
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-amber-900/80">
              Your account does not have a group operations permission for {group.name}. Your
              personal Member space remains available if you are an active member.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-amber-950"
            >
              Open My space <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </main>
      </>
    )
  }

  const supabase = await createClient()
  const canReadMembers = can('members:read')
  const canReadContributions = can('contributions:read', 'financial:read')
  const canReadLoans = can('loans:read', 'financial:read')
  const canReadRepayments = can('repayments:read', 'financial:read')
  const canReadFinancialSummary = can('financial:read')
  const canReviewMembership = can('membership:requests_review')
  const canVerifyContributions = can('contributions:verify')
  const canApproveLoans = can('loans:approve')
  const canReadMeetings = can('meetings:read', 'meetings:manage')
  const canReviewDecisions = can('meetings:read')
  const canReadActivity = can('audit:read', 'financial_audit:read')
  const canPublishAnnouncements = can('announcements:manage')
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const trendMonths = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1))
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('en-RW', { month: 'short' }).format(date),
    }
  })
  const historyStart = trendMonths[0]!.key
  const currentPeriod = trendMonths[trendMonths.length - 1]!
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10)

  const [
    membersResult,
    pendingRequestsResult,
    contributionsResult,
    obligationsResult,
    loansResult,
    repaymentsResult,
    summaryResult,
    meetingsResult,
    meetingIdsResult,
    activityResult,
    announcementsResult,
  ] = await Promise.all([
    canReadMembers
      ? supabase.from('members').select('id,full_name,status').eq('group_id', group.id)
      : Promise.resolve({ data: null, error: null }),
    canReviewMembership
      ? supabase
          .from('join_requests')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', group.id)
          .eq('status', 'pending')
      : Promise.resolve({ data: null, count: null, error: null }),
    canReadContributions
      ? supabase
          .from('contributions')
          .select('amount,status,period,obligation_id')
          .eq('group_id', group.id)
          .gte('period', historyStart)
          .lt('period', nextMonth)
          .limit(10000)
      : Promise.resolve({ data: null, error: null }),
    can('obligations:read')
      ? supabase
          .from('contribution_obligations')
          .select('id,amount_due,penalty_amount,status,due_on,member_id,period')
          .eq('group_id', group.id)
          .gte('period', historyStart)
          .lt('period', nextMonth)
          .limit(10000)
      : Promise.resolve({ data: null, error: null }),
    canReadLoans
      ? supabase
          .from('loans')
          .select('principal,outstanding_amount,outstanding_interest,status,due_date,created_at')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(5000)
      : Promise.resolve({ data: null, error: null }),
    canReadRepayments
      ? supabase
          .from('loan_repayments')
          .select('amount,status,received_at')
          .eq('group_id', group.id)
          .gte('received_at', historyStart)
          .lt('received_at', nextMonth)
          .limit(10000)
      : Promise.resolve({ data: null, error: null }),
    canReadFinancialSummary
      ? supabase
          .from('savings_summary')
          .select(
            'available_balance,total_contributions,total_loans_outstanding,interest_collected,group_expenses,as_of',
          )
          .eq('group_id', group.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    canReadMeetings
      ? supabase
          .from('meetings')
          .select('id,title,starts_at,location')
          .eq('group_id', group.id)
          .gte('starts_at', now.toISOString())
          .order('starts_at')
          .limit(4)
      : Promise.resolve({ data: null, error: null }),
    canReadMeetings
      ? supabase.from('meetings').select('id').eq('group_id', group.id).limit(500)
      : Promise.resolve({ data: null, error: null }),
    canReadActivity
      ? supabase
          .from('audit_logs')
          .select('id,action,entity,created_at')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: null, error: null }),
    canPublishAnnouncements
      ? supabase
          .from('group_announcements')
          .select('id,title,published_at,created_at')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: null, error: null }),
  ])

  const meetingIds = (meetingIdsResult.data ?? []).map((meeting) => meeting.id)
  const decisionsResult =
    canReviewDecisions && meetingIds.length
      ? await supabase
          .from('meeting_decisions')
          .select('id,outcome,voting_open')
          .in('meeting_id', meetingIds)
      : { data: [], error: null }

  const queryIssues = [
    membersResult.error,
    pendingRequestsResult.error,
    contributionsResult.error,
    obligationsResult.error,
    loansResult.error,
    repaymentsResult.error,
    summaryResult.error,
    meetingsResult.error,
    meetingIdsResult.error,
    decisionsResult.error,
    activityResult.error,
    announcementsResult.error,
  ].filter(Boolean)
  const members = membersResult.data ?? []
  const activeMembers = members.filter((member) => member.status === 'active').length
  const inactiveMembers = members.filter((member) => member.status === 'inactive').length
  const suspendedMembers = members.filter((member) => member.status === 'suspended').length
  const allContributions = contributionsResult.data ?? []
  const contributions = allContributions.filter(
    (row) => String(row.period).slice(0, 7) === currentPeriod.key.slice(0, 7),
  )
  const verifiedContributions = contributions.filter((row) => row.status === 'verified')
  const pendingContributions = contributions.filter((row) => row.status === 'pending').length
  const receivedThisPeriod = verifiedContributions.reduce((sum, row) => sum + Number(row.amount), 0)
  const allObligations = obligationsResult.data ?? []
  const obligations = allObligations.filter(
    (row) => String(row.period).slice(0, 7) === currentPeriod.key.slice(0, 7),
  )
  const dueObligations = obligations.filter((row) => row.status === 'due')
  const partialObligations = obligations.filter((row) => row.status === 'partially_paid')
  const paidObligations = obligations.filter((row) => row.status === 'paid')
  const waivedObligations = obligations.filter((row) => row.status === 'waived')
  const outstandingObligationCount = dueObligations.length + partialObligations.length
  const verifiedByObligation = new Map<string, number>()
  for (const contribution of allContributions) {
    if (contribution.status !== 'verified' || !contribution.obligation_id) continue
    verifiedByObligation.set(
      contribution.obligation_id,
      (verifiedByObligation.get(contribution.obligation_id) ?? 0) + Number(contribution.amount),
    )
  }
  const dueObligationAmount = [...dueObligations, ...partialObligations].reduce(
    (sum, obligation) =>
      sum +
      Math.max(
        0,
        Number(obligation.amount_due) +
          Number(obligation.penalty_amount) -
          (verifiedByObligation.get(obligation.id) ?? 0),
      ),
    0,
  )
  const loans = loansResult.data ?? []
  const activeLoans = loans.filter((loan) => ['active', 'defaulted'].includes(loan.status))
  const issuedLoans = loans.filter((loan) =>
    ['active', 'repaid', 'defaulted'].includes(loan.status),
  )
  const pendingLoans = loans.filter((loan) => loan.status === 'pending').length
  const dueLoans = activeLoans.filter((loan) => Boolean(loan.due_date && loan.due_date < today))
  const outstandingPrincipal = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.outstanding_amount),
    0,
  )
  const outstandingInterest = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.outstanding_interest),
    0,
  )
  const issuedPrincipal = issuedLoans.reduce((sum, loan) => sum + Number(loan.principal), 0)
  const issuedOutstandingPrincipal = issuedLoans.reduce(
    (sum, loan) => sum + Number(loan.outstanding_amount),
    0,
  )
  const pendingRequests = pendingRequestsResult.count ?? 0
  const decisions = decisionsResult.data ?? []
  const unresolvedDecisions = decisions.filter((decision) => decision.outcome === null)
  const pendingGovernance =
    can('meetings:manage') && canReviewDecisions ? unresolvedDecisions.length : 0
  const summary = summaryResult.data
  const periodName = new Intl.DateTimeFormat('en-RW', { month: 'long', year: 'numeric' }).format(
    now,
  )
  const groupHref = (path: string) => `${path}?group=${encodeURIComponent(group.id)}`

  const flowByMonth = new Map<string, GroupFlowPeriod>(
    trendMonths.map((month) => [month.key, { ...month, contributions: 0, repayments: 0 }]),
  )
  for (const contribution of allContributions) {
    if (contribution.status !== 'verified') continue
    const monthKey = `${String(contribution.period).slice(0, 7)}-01`
    const period = flowByMonth.get(monthKey)
    if (period) period.contributions += Number(contribution.amount)
  }
  for (const repayment of repaymentsResult.data ?? []) {
    if (repayment.status !== 'verified') continue
    const date = new Date(repayment.received_at)
    const monthKey = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10)
    const period = flowByMonth.get(monthKey)
    if (period) period.repayments += Number(repayment.amount)
  }
  const flowPeriods = [...flowByMonth.values()]

  let paymentMatrix: GroupPaymentMatrix | null = null
  if (canReadMembers && can('obligations:read')) {
    const matrixPeriods = trendMonths.slice(-6)
    const obligationsByMemberPeriod = new Map<string, (typeof allObligations)[number][]>()
    for (const obligation of allObligations) {
      const key = `${obligation.member_id}:${String(obligation.period).slice(0, 10)}`
      const existing = obligationsByMemberPeriod.get(key) ?? []
      existing.push(obligation)
      obligationsByMemberPeriod.set(key, existing)
    }
    const activeGroupMembers = members
      .filter((member) => member.status === 'active')
      .sort((left, right) => left.full_name.localeCompare(right.full_name))
    paymentMatrix = {
      periods: matrixPeriods,
      rows: activeGroupMembers.map((member) => ({
        id: member.id,
        name: member.full_name,
        cells: matrixPeriods.map((period): PaymentMatrixCell => {
          const monthObligations = obligationsByMemberPeriod.get(`${member.id}:${period.key}`) ?? []
          if (!monthObligations.length) return { status: 'missing' }
          const statuses = monthObligations.map((obligation) => {
            if (obligation.status === 'due' && obligation.due_on < today) return 'overdue' as const
            return obligation.status as PaymentMatrixCell['status']
          })
          const status: PaymentMatrixCell['status'] = statuses.includes('overdue')
            ? 'overdue'
            : statuses.includes('due')
              ? 'due'
              : statuses.includes('partially_paid')
                ? 'partially_paid'
                : statuses.includes('paid')
                  ? 'paid'
                  : 'waived'
          return { status, dueOn: monthObligations.map((item) => item.due_on).sort()[0] }
        }),
      })),
    }
  }

  const currentExpected = can('obligations:read')
    ? obligations
        .filter((obligation) => obligation.status !== 'waived')
        .reduce((sum, item) => sum + Number(item.amount_due) + Number(item.penalty_amount), 0)
    : null
  const collectionSignal =
    currentExpected !== null && currentExpected > 0 && canReadContributions
      ? Math.min(100, (receivedThisPeriod / currentExpected) * 100)
      : null
  const membershipSignal =
    canReadMembers && members.length > 0 ? (activeMembers / members.length) * 100 : null
  const repaymentSignal =
    canReadLoans && issuedPrincipal > 0
      ? Math.max(
          0,
          Math.min(100, ((issuedPrincipal - issuedOutstandingPrincipal) / issuedPrincipal) * 100),
        )
      : null
  const governanceSignal =
    canReviewDecisions && decisions.length > 0
      ? ((decisions.length - unresolvedDecisions.length) / decisions.length) * 100
      : null
  const attention = [
    canReviewMembership && pendingRequests > 0
      ? {
          title: `${pendingRequests} membership request${pendingRequests === 1 ? '' : 's'} awaiting review`,
          description: 'Review the applicant and record an authorized decision.',
          href: groupHref('/dashboard/membership-requests'),
          label: 'Review',
        }
      : null,
    canVerifyContributions && pendingContributions > 0
      ? {
          title: `${pendingContributions} contribution${pendingContributions === 1 ? '' : 's'} awaiting verification`,
          description: 'Submitted amounts are excluded from verified totals.',
          href: groupHref('/dashboard/contributions'),
          label: 'Verify',
        }
      : null,
    canApproveLoans && pendingLoans > 0
      ? {
          title: `${pendingLoans} loan application${pendingLoans === 1 ? '' : 's'} awaiting decision`,
          description: 'Your loan approval permission allows you to decide these requests.',
          href: groupHref('/dashboard/loans'),
          label: 'Review',
        }
      : null,
    canReadLoans && dueLoans.length > 0
      ? {
          title: `${dueLoans.length} loan${dueLoans.length === 1 ? '' : 's'} past the due date`,
          description: 'Review repayment status and follow up with assigned officials.',
          href: groupHref('/dashboard/loans'),
          label: 'Follow up',
        }
      : null,
    pendingGovernance > 0
      ? {
          title: `${pendingGovernance} unresolved governance decision${pendingGovernance === 1 ? '' : 's'}`,
          description: 'Review open meeting decisions and recorded voting state.',
          href: groupHref('/dashboard/meetings'),
          label: 'Open',
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))
  const showAnalyticsBoard =
    canReadMembers ||
    canReviewMembership ||
    canReadContributions ||
    canReadLoans ||
    canReadFinancialSummary ||
    canReviewDecisions ||
    can('obligations:read')

  const analyticsData: GroupAnalyticsData = {
    groupId: group.id,
    currency: group.currency,
    monthName: periodName,
    asOf: summary?.as_of ? formatDate(summary.as_of) : '',
    balance: canReadFinancialSummary ? (summary ? Number(summary.available_balance) : null) : null,
    received: canReadContributions ? receivedThisPeriod : null,
    expected: currentExpected,
    totalContributions:
      canReadFinancialSummary && summary ? Number(summary.total_contributions) : null,
    outstandingObligationAmount: can('obligations:read') ? dueObligationAmount : null,
    loansPastDue: canReadLoans ? dueLoans.length : null,
    pendingLoans: canApproveLoans ? pendingLoans : null,
    activeMembers: canReadMembers ? activeMembers : null,
    inactiveMembers: canReadMembers ? inactiveMembers : null,
    suspendedMembers: canReadMembers ? suspendedMembers : null,
    pendingRequests: canReviewMembership ? pendingRequests : null,
    unresolvedDecisions: canReviewDecisions ? unresolvedDecisions.length : null,
    outstandingPrincipal: canReadLoans ? outstandingPrincipal : null,
    outstandingInterest: canReadLoans ? outstandingInterest : null,
    issuedPrincipal: canReadLoans ? issuedPrincipal : null,
    issuedOutstandingPrincipal: canReadLoans ? issuedOutstandingPrincipal : null,
    paidObligations: can('obligations:read') ? paidObligations.length : null,
    partialObligations: can('obligations:read') ? partialObligations.length : null,
    dueObligations: can('obligations:read') ? dueObligations.length : null,
    waivedObligations: can('obligations:read') ? waivedObligations.length : null,
    signals: [
      { key: 'collection', label: 'Obligations collected', value: collectionSignal },
      { key: 'principal', label: 'Principal returned', value: repaymentSignal },
      { key: 'members', label: 'Active membership', value: membershipSignal },
      { key: 'decisions', label: 'Decisions resolved', value: governanceSignal },
    ],
    periods: flowPeriods,
    paymentMatrix,
    canReadContributions,
    canReadRepayments,
    attention,
  }

  return (
    <>
      <DashboardHeader title="Group overview" description={`${group.name} · Manage Ikimina`} />
      <main className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:space-y-6 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-violet-700">
              Group operations
            </p>
            <h2 className="mt-1 font-heading text-xl font-extrabold tracking-tight text-[#081233] sm:text-2xl">
              {group.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Permission-scoped operational view · {group.contribution_frequency} contribution cycle
            </p>
          </div>
        </div>

        {queryIssues.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
          >
            Some permitted group summaries could not be loaded. Other available workspace data is
            shown; refresh or try again later.
          </div>
        )}

        {showAnalyticsBoard ? (
          <GroupAnalyticsBoard key={group.id} data={analyticsData} />
        ) : (
          <WorkspaceSection eyebrow="Group operations" title="Your permitted workspace">
            <EmptyMessage>
              Your assigned group capability is active. There is no operational summary available
              for it yet; use the permitted section in the navigation.
            </EmptyMessage>
          </WorkspaceSection>
        )}

        <details className="group overflow-hidden rounded-[22px] border border-violet-100 bg-white/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 sm:px-5">
            <span>
              <span className="block text-[9px] font-extrabold uppercase tracking-[.15em] text-violet-700">
                Explore records
              </span>
              <span className="mt-1 block font-heading text-sm font-extrabold text-[#21103e]">
                Operational details
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700">
              Expand{' '}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
            </span>
          </summary>
          <section className="grid gap-4 border-t border-violet-50 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-2">
            {canReadMembers && (
              <WorkspaceSection
                eyebrow="Membership"
                title="Member status"
                href={groupHref('/dashboard/members')}
                linkLabel="Open member directory"
              >
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['Active', activeMembers],
                    ['Inactive', inactiveMembers],
                    ['Suspended', suspendedMembers],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 font-heading text-xl font-extrabold text-[#081233]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                {canReviewMembership && (
                  <p className="mt-3 text-[11px] text-slate-600">
                    {pendingRequests} request{pendingRequests === 1 ? '' : 's'} await an explicit
                    membership decision.
                  </p>
                )}
              </WorkspaceSection>
            )}
            {canReadContributions && (
              <WorkspaceSection
                eyebrow="Contributions"
                title={`${periodName} collection`}
                href={groupHref('/dashboard/contributions')}
                linkLabel="Open contributions"
              >
                {contributions.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-800">
                        Verified received
                      </p>
                      <p className="mt-1 font-heading text-lg font-extrabold text-emerald-950">
                        {formatMoney(receivedThisPeriod, group.currency)}
                      </p>
                      <p className="mt-1 text-[10px] text-emerald-800">
                        {verifiedContributions.length} verified records
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-amber-800">
                        Awaiting verification
                      </p>
                      <p className="mt-1 font-heading text-lg font-extrabold text-amber-950">
                        {pendingContributions}
                      </p>
                      <p className="mt-1 text-[10px] text-amber-800">Pending records</p>
                    </div>
                  </div>
                ) : (
                  <EmptyMessage>
                    No contribution records are available for {periodName}.
                  </EmptyMessage>
                )}
                {canVerifyContributions && pendingContributions > 0 && (
                  <p className="mt-3 text-[10px] font-semibold text-slate-600">
                    Verification authority is assigned. Pending records have not been included in
                    received totals.
                  </p>
                )}
              </WorkspaceSection>
            )}
            {canReadLoans && (
              <WorkspaceSection
                eyebrow="Loans"
                title="Loan portfolio"
                href={groupHref('/dashboard/loans')}
                linkLabel="Open loan workspace"
              >
                {loans.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-indigo-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-800">
                        Open loans
                      </p>
                      <p className="mt-1 font-heading text-xl font-extrabold text-indigo-950">
                        {activeLoans.length}
                      </p>
                      <p className="mt-1 text-[10px] text-indigo-800">
                        Principal {formatMoney(outstandingPrincipal, group.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-violet-800">
                        Interest outstanding
                      </p>
                      <p className="mt-1 font-heading text-lg font-extrabold text-violet-950">
                        {formatMoney(outstandingInterest, group.currency)}
                      </p>
                      <p className="mt-1 text-[10px] text-violet-800">
                        Shown separately from principal
                      </p>
                    </div>
                  </div>
                ) : (
                  <EmptyMessage>There are no open or pending loans for this group.</EmptyMessage>
                )}
                <p className="mt-3 text-[10px] text-slate-600">
                  {canApproveLoans
                    ? 'You can review and decide applications under your loan approval permission.'
                    : 'You can review loan records; approval actions require a separate permission.'}
                </p>
              </WorkspaceSection>
            )}
            {can('obligations:read') && (
              <WorkspaceSection
                eyebrow="Payment obligations"
                title={periodName}
                href={groupHref('/dashboard/operations')}
                linkLabel="Open operations"
              >
                {outstandingObligationCount ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3.5">
                    <div>
                      <p className="text-xs font-bold text-amber-950">
                        {outstandingObligationCount} unsettled obligation
                        {outstandingObligationCount === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1 text-[10px] text-amber-800">
                        {dueObligations.length} due in full · {partialObligations.length} partly
                        paid
                      </p>
                    </div>
                    <p className="font-heading text-lg font-extrabold text-amber-950">
                      {formatMoney(dueObligationAmount, group.currency)}
                      <span className="block text-[9px] font-semibold">remaining amount</span>
                    </p>
                  </div>
                ) : (
                  <EmptyMessage>
                    No outstanding contribution obligations are recorded for this period.
                  </EmptyMessage>
                )}
              </WorkspaceSection>
            )}
            {canReadMeetings && (
              <WorkspaceSection
                eyebrow="Governance"
                title="Upcoming meetings"
                href={groupHref('/dashboard/meetings')}
                linkLabel="Open governance"
              >
                {(meetingsResult.data ?? []).length ? (
                  <ul className="divide-y divide-slate-100">
                    {(meetingsResult.data ?? []).map((meeting) => (
                      <li
                        key={meeting.id}
                        className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{meeting.title}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {formatDate(meeting.starts_at)}
                            {meeting.location ? ` · ${meeting.location}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyMessage>No upcoming meeting has been recorded.</EmptyMessage>
                )}
                {canReviewDecisions && can('meetings:manage') && (
                  <p className="mt-3 text-[10px] text-slate-600">
                    {unresolvedDecisions.length} decision
                    {unresolvedDecisions.length === 1 ? '' : 's'} have no recorded outcome.
                  </p>
                )}
              </WorkspaceSection>
            )}
            {canPublishAnnouncements && (
              <WorkspaceSection
                eyebrow="Official communication"
                title="Recent announcements"
                href={groupHref('/dashboard/announcements')}
                linkLabel="Manage announcements"
              >
                {(announcementsResult.data ?? []).length ? (
                  <ul className="divide-y divide-slate-100">
                    {(announcementsResult.data ?? []).map((announcement) => (
                      <li
                        key={announcement.id}
                        className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{announcement.title}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {announcement.published_at
                              ? `Published ${formatDate(announcement.published_at)}`
                              : 'Draft'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-bold ${announcement.published_at ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {announcement.published_at ? 'Published' : 'Draft'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyMessage>No announcements have been drafted or published.</EmptyMessage>
                )}
              </WorkspaceSection>
            )}
            {canReadActivity && (
              <WorkspaceSection
                eyebrow="Traceability"
                title="Recent group activity"
                href={groupHref('/dashboard/audit')}
                linkLabel="Open activity log"
              >
                {(activityResult.data ?? []).length ? (
                  <ul className="divide-y divide-slate-100">
                    {(activityResult.data ?? []).map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Activity className="h-4 w-4 shrink-0 text-indigo-700" />
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {entry.entity.replaceAll('_', ' ')} · {entry.action}
                          </p>
                        </div>
                        <time className="shrink-0 text-[10px] text-slate-500">
                          {formatDate(entry.created_at)}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyMessage>No group activity has been recorded yet.</EmptyMessage>
                )}
              </WorkspaceSection>
            )}
          </section>
        </details>
      </main>
    </>
  )
}
