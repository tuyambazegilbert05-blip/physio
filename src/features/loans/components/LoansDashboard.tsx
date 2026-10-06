'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  CircleDollarSign,
  Clock3,
  Percent,
  Plus,
} from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormCard } from '@/components/ui/FormCard'
import { FormError } from '@/components/forms/FormError'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { GroupForm } from '@/features/groups/components/GroupForm'
import { LoanActionsDialog } from '@/features/loans/components/LoanActionsDialog'
import { LoanCard } from '@/features/loans/components/LoanCard'
import { LoanForm } from '@/features/loans/components/LoanForm'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/formatters'
import type { Loan } from '@/types/loan'
import type { Member } from '@/types/member'
import type { GroupAccess } from '@/types/role'

type Repayment = {
  id: string
  loan_id: string
  amount: number
  principal_amount: number
  interest_amount: number
  status: 'pending' | 'verified' | 'rejected'
  received_at: string
  reference: string | null
  payment_method: string
}
const emptyLoans: Loan[] = []
const emptyMembers: Member[] = []
const emptyRepayments: Repayment[] = []

type LoanActivity = {
  id: string
  createdAt: string
  title: string
  description: string
  amount: number
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  note: string
  icon: typeof CircleDollarSign
  tone: 'blue' | 'violet' | 'cyan' | 'amber'
}) {
  const iconStyles = {
    blue: 'bg-blue-50 text-[#2437F5]',
    violet: 'bg-violet-50 text-[#7B3FF2]',
    cyan: 'bg-cyan-50 text-cyan-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone]

  return (
    <article className="flex min-w-0 items-center justify-between gap-3 border-b border-indigo-100/80 bg-white/90 px-4 py-4 first:rounded-t-[22px] last:rounded-b-[22px] sm:border-b-0 sm:border-r sm:px-5 sm:first:rounded-l-[22px] sm:first:rounded-tr-none sm:last:rounded-r-[22px] sm:last:rounded-bl-none">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold text-slate-400">{label}</p>
        <p className="mt-1 font-heading text-xl font-extrabold tracking-tight text-[#231044]">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[9px] text-slate-400">{note}</p>
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconStyles}`}
      >
        <Icon className="h-4 w-4" />
      </span>
    </article>
  )
}

function memberNameFor(loan: Loan, members: Member[]) {
  return members.find((member) => member.id === loan.member_id)?.full_name ?? 'Group member'
}

function buildActivity(loans: Loan[], members: Member[], repayments: Repayment[]) {
  const loanMap = new Map(loans.map((loan) => [loan.id, loan]))
  const repaymentsActivity: LoanActivity[] = repayments.map((repayment) => {
    const loan = loanMap.get(repayment.loan_id)
    const name = loan ? memberNameFor(loan, members) : 'Group member'
    return {
      id: `repayment-${repayment.id}`,
      createdAt: repayment.received_at,
      title:
        repayment.status === 'verified'
          ? 'Repayment received'
          : repayment.status === 'pending'
            ? 'Repayment awaiting review'
            : 'Repayment declined',
      description: `${name}${loan ? ` · ${loan.purpose}` : ''}`,
      amount: repayment.amount,
    }
  })
  const disbursements: LoanActivity[] = loans
    .filter((loan) => loan.disbursed_at)
    .map((loan) => ({
      id: `disbursement-${loan.id}`,
      createdAt: loan.disbursed_at!,
      title: 'Loan issued',
      description: `${memberNameFor(loan, members)} · ${loan.purpose}`,
      amount: loan.principal,
    }))

  return [...repaymentsActivity, ...disbursements]
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
    .slice(0, 6)
}

function exportLoans(loans: Loan[], members: Member[], currency: string, groupName: string) {
  const values = [
    [
      'Member',
      'Purpose',
      'Status',
      'Principal',
      'Outstanding principal',
      'Interest due',
      'Rate',
      'Due date',
    ],
    ...loans.map((loan) => [
      memberNameFor(loan, members),
      loan.purpose,
      loan.status,
      `${loan.principal} ${currency}`,
      `${loan.outstanding_amount} ${currency}`,
      `${loan.outstanding_interest} ${currency}`,
      `${loan.interest_rate}%`,
      loan.due_date ?? '',
    ]),
  ]
  const csv = values
    .map((row) =>
      row
        .map((value) => {
          const text = String(value)
          const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
          return `"${safeText.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-loans.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function LoansDashboard() {
  const { groups, group, setGroup, loading: groupsLoading, error: groupError } = useActiveGroup()
  const [workspace, setWorkspace] = useState<{
    groupId: string
    loans: Loan[]
    members: Member[]
    repayments: Repayment[]
    access: GroupAccess | null
  } | null>(null)
  const [errorState, setErrorState] = useState<{ groupId: string; message: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null)
  const requestVersion = useRef(0)
  const currentWorkspace = group && workspace?.groupId === group.id ? workspace : null
  const loans = currentWorkspace?.loans ?? emptyLoans
  const members = currentWorkspace?.members ?? emptyMembers
  const repayments = currentWorkspace?.repayments ?? emptyRepayments
  const access = currentWorkspace?.access ?? null
  const loading = Boolean(group && !currentWorkspace) || refreshing
  const error = group && errorState?.groupId === group.id ? errorState.message : ''

  const refresh = useCallback(async () => {
    if (!group) {
      requestVersion.current += 1
      return
    }
    const currentRequest = ++requestVersion.current
    setRefreshing(true)
    setErrorState(null)
    try {
      const groupId = encodeURIComponent(group.id)
      const [loanRows, memberRows, accessSnapshot, repaymentRows] = await Promise.all([
        apiRequest<Loan[]>(`/api/loans?group_id=${groupId}`),
        apiRequest<Member[]>(`/api/members?group_id=${groupId}`),
        apiRequest<GroupAccess>(`/api/roles?group_id=${groupId}`),
        apiRequest<Repayment[]>(`/api/loan-repayments?group_id=${groupId}`),
      ])
      if (currentRequest !== requestVersion.current) return
      setWorkspace({
        groupId: group.id,
        loans: loanRows,
        members: memberRows,
        access: accessSnapshot,
        repayments: repaymentRows,
      })
    } catch (cause) {
      if (currentRequest !== requestVersion.current) return
      setErrorState({
        groupId: group.id,
        message: cause instanceof Error ? cause.message : 'Could not load loan records.',
      })
    } finally {
      if (currentRequest === requestVersion.current) setRefreshing(false)
    }
  }, [group])

  useEffect(() => {
    if (!group) return
    let active = true
    const currentRequest = ++requestVersion.current
    const groupId = encodeURIComponent(group.id)
    Promise.all([
      apiRequest<Loan[]>(`/api/loans?group_id=${groupId}`),
      apiRequest<Member[]>(`/api/members?group_id=${groupId}`),
      apiRequest<GroupAccess>(`/api/roles?group_id=${groupId}`),
      apiRequest<Repayment[]>(`/api/loan-repayments?group_id=${groupId}`),
    ])
      .then(([loanRows, memberRows, accessSnapshot, repaymentRows]) => {
        if (!active || currentRequest !== requestVersion.current) return
        setWorkspace({
          groupId: group.id,
          loans: loanRows,
          members: memberRows,
          access: accessSnapshot,
          repayments: repaymentRows,
        })
        setErrorState(null)
      })
      .catch((cause: unknown) => {
        if (!active || currentRequest !== requestVersion.current) return
        setWorkspace({
          groupId: group.id,
          loans: [],
          members: [],
          access: null,
          repayments: [],
        })
        setErrorState({
          groupId: group.id,
          message: cause instanceof Error ? cause.message : 'Could not load loan records.',
        })
      })
    return () => {
      active = false
      requestVersion.current += 1
    }
  }, [group])

  const permissions = access?.permissions ?? []
  const can = (permission: string) => permissions.includes(permission)
  const canSeeLoans = Boolean(access?.is_member || can('loans:read'))
  const currentMember = members.find(
    (member) => member.user_id === access?.current_user_id && member.status === 'active',
  )
  const canApply = Boolean(access?.is_member && currentMember)
  const visibleLoans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return loans
    return loans.filter((loan) =>
      [memberNameFor(loan, members), loan.purpose, loan.status, loan.principal]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [loans, members, query])
  const activity = useMemo(
    () => buildActivity(loans, members, repayments),
    [loans, members, repayments],
  )

  const openLoans = loans.filter((loan) => ['active', 'defaulted'].includes(loan.status))
  const totalOutstanding = loans
    .filter((loan) => ['active', 'defaulted'].includes(loan.status))
    .reduce((total, loan) => total + loan.outstanding_amount + loan.outstanding_interest, 0)
  const totalIssued = loans
    .filter((loan) => ['active', 'defaulted', 'repaid'].includes(loan.status))
    .reduce((total, loan) => total + loan.principal, 0)
  const paidPrincipal = loans
    .filter((loan) => ['active', 'defaulted', 'repaid'].includes(loan.status))
    .reduce((total, loan) => total + Math.max(0, loan.principal - loan.outstanding_amount), 0)
  const rateBasis = loans.filter((loan) => ['active', 'defaulted'].includes(loan.status))
  const averageRate = rateBasis.length
    ? rateBasis.reduce((total, loan) => total + loan.interest_rate, 0) / rateBasis.length
    : 0
  const today = new Date().toISOString().slice(0, 10)
  const overdueCount = openLoans.filter(
    (loan) =>
      loan.due_date &&
      loan.due_date < today &&
      loan.outstanding_amount + loan.outstanding_interest > 0,
  ).length
  const titleDescription = group
    ? `${group.name} · ${openLoans.length} open loan${openLoans.length === 1 ? '' : 's'}`
    : 'Review applications, balances, repayments, and due dates.'

  if (groupsLoading) return <p className="p-8 text-sm text-slate-500">Loading your groups…</p>
  if (groupError)
    return (
      <main className="p-6">
        <FormError message={groupError} />
      </main>
    )
  if (groups.length === 0)
    return (
      <main className="mx-auto max-w-4xl p-5 sm:p-8">
        <FormCard
          title="Set up your group loans"
          description="Create your savings group to manage loan applications and repayments."
        >
          <GroupForm />
        </FormCard>
      </main>
    )

  return (
    <>
      <DashboardHeader title="Loans" description={titleDescription} />
      <main className="mx-auto w-full max-w-[1500px] space-y-5 p-5 sm:space-y-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid max-w-sm flex-1 gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
            Active group
            <Select
              value={group?.id ?? ''}
              onChange={(event) => {
                const next = groups.find((item) => item.id === event.target.value)
                if (next) setGroup(next)
              }}
            >
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => group && exportLoans(loans, members, group.currency, group.name)}
              disabled={!loans.length}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#4d42cf] shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" /> Export
            </button>
            {canApply && (
              <button
                type="button"
                onClick={() => setApplicationOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-4 py-2.5 text-xs font-bold text-white shadow-[0_10px_22px_-12px_rgba(83,55,220,0.9)] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Plus className="h-3.5 w-3.5" /> Apply for a loan
              </button>
            )}
          </div>
        </div>

        <section
          aria-label="Loan summary"
          className="grid overflow-hidden rounded-[22px] shadow-[0_16px_40px_-32px_rgba(83,55,220,0.35)] sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            label="Outstanding"
            value={formatMoney(totalOutstanding, group?.currency)}
            note={`of ${formatMoney(totalIssued, group?.currency)} issued`}
            icon={CircleDollarSign}
            tone="violet"
          />
          <MetricCard
            label="Paid so far"
            value={formatMoney(paidPrincipal, group?.currency)}
            note="Verified principal repayments"
            icon={ArrowDownToLine}
            tone="blue"
          />
          <MetricCard
            label="Interest rate"
            value={`${averageRate.toFixed(averageRate % 1 ? 1 : 0)}%`}
            note="Average across open loans"
            icon={Percent}
            tone="cyan"
          />
          <MetricCard
            label="Overdue"
            value={String(overdueCount)}
            note={overdueCount ? 'Loans past their due date' : 'All due dates are on track'}
            icon={overdueCount ? AlertTriangle : Clock3}
            tone={overdueCount ? 'amber' : 'blue'}
          />
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_250px]">
          <section className="space-y-3 xl:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
                  Portfolio
                </p>
                <h2 className="font-heading text-lg font-extrabold tracking-tight text-[#231044]">
                  {openLoans.length} open loan{openLoans.length === 1 ? '' : 's'}
                </h2>
              </div>
              <Input
                aria-label="Search loans"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search loans or members"
                className="max-w-sm bg-white/80"
              />
            </div>

            {error && <FormError message={error} />}
            {!access && !error && (
              <p
                role="status"
                className="rounded-2xl border border-indigo-100 bg-white/75 p-4 text-sm text-slate-500"
              >
                Loading group permissions…
              </p>
            )}
            {access && !canSeeLoans && (
              <p className="rounded-2xl border border-indigo-100 bg-white/75 p-4 text-sm leading-relaxed text-slate-500">
                This account does not have permission to view this group’s loan records.
              </p>
            )}
            {loading ? (
              <p
                role="status"
                className="rounded-2xl border border-indigo-100 bg-white/75 p-5 text-sm text-slate-500"
              >
                Loading loan records…
              </p>
            ) : canSeeLoans && visibleLoans.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleLoans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    currency={group?.currency}
                    memberName={memberNameFor(loan, members)}
                    paidPrincipal={Math.max(0, loan.principal - loan.outstanding_amount)}
                    onAction={() => setActiveLoan(loan)}
                  />
                ))}
              </div>
            ) : access && canSeeLoans ? (
              <EmptyState
                title={query ? 'No matching loans' : 'No loans yet'}
                description={
                  query
                    ? 'Try another name, status, or purpose.'
                    : `Loans recorded for ${group?.name ?? 'this group'} will appear here.`
                }
              />
            ) : null}
          </section>

          <aside className="rounded-[24px] border border-white/90 bg-white/90 p-4 shadow-[0_18px_48px_-34px_rgba(83,55,220,0.38)] backdrop-blur-xl sm:p-5">
            <div className="mb-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
                Timeline
              </p>
              <h2 className="mt-1 font-heading text-sm font-extrabold text-[#231044]">
                Repayment history
              </h2>
            </div>
            {activity.length ? (
              <ol className="space-y-4">
                {activity.map((item) => (
                  <li
                    key={item.id}
                    className="relative border-l border-violet-200 pl-3.5 last:border-transparent"
                  >
                    <span className="absolute -left-[5px] top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#A020F0] bg-white shadow-[0_0_0_2px_white]" />
                    <p className="text-[10px] font-extrabold leading-tight text-[#231044]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[9px] font-semibold text-[#7B3FF2]">
                      {formatMoney(item.amount, group?.currency)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-slate-400">
                      {item.description} · {formatDate(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl bg-indigo-50/60 p-3 text-[10px] leading-relaxed text-slate-500">
                Verified repayments and disbursements will appear here.
              </p>
            )}
          </aside>
        </div>
      </main>

      {applicationOpen && currentMember && group && (
        <Modal
          open={applicationOpen}
          title="Apply for a loan"
          onClose={() => setApplicationOpen(false)}
        >
          <p className="mb-4 text-sm leading-relaxed text-slate-500">
            Apply to {group.name}. The committee will review your request before any funds are
            issued.
          </p>
          <LoanForm
            groupId={group.id}
            memberId={currentMember.id}
            currency={group.currency}
            onCreated={() => {
              setApplicationOpen(false)
              void refresh()
            }}
          />
        </Modal>
      )}

      {activeLoan && (
        <LoanActionsDialog
          key={activeLoan.id}
          loan={activeLoan}
          memberName={memberNameFor(activeLoan, members)}
          currency={group?.currency ?? 'RWF'}
          open
          isOwn={Boolean(activeLoan.is_own)}
          canApprove={can('loans:approve')}
          canDisburse={can('loans:disburse')}
          canManage={can('loans:manage')}
          canRecordRepayments={can('repayments:record')}
          canVerifyRepayments={can('repayments:verify')}
          onClose={() => setActiveLoan(null)}
          onChanged={() => void refresh()}
        />
      )}
    </>
  )
}
