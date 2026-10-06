'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  CreditCard,
  HandCoins,
  HeartHandshake,
  MessageCircle,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { GroupSelector } from '@/features/dashboard/components/GroupSelector'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { MemberCommunications } from '@/features/members/components/MemberCommunications'
import { MemberGuide } from '@/features/members/components/MemberGuide'
import { apiRequest } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/formatters'
import { roleLabels, type GroupRole } from '@/types/role'
import type { MemberPosition } from '@/features/members/types/member-position'

export type MemberArea =
  'overview' | 'savings' | 'contributions' | 'loans' | 'statements' | 'communications'

const personalLinks = [
  { area: 'overview', label: 'My overview', href: '/dashboard', icon: UserRound },
  { area: 'savings', label: 'My savings & shares', href: '/dashboard/my/savings', icon: PiggyBank },
  {
    area: 'contributions',
    label: 'My contributions',
    href: '/dashboard/my/contributions',
    icon: ReceiptText,
  },
  { area: 'loans', label: 'My loans & repayments', href: '/dashboard/my/loans', icon: HandCoins },
  {
    area: 'statements',
    label: 'My statements',
    href: '/dashboard/my/statements',
    icon: WalletCards,
  },
  {
    area: 'communications',
    label: 'My communications',
    href: '/dashboard/my/communications',
    icon: MessageCircle,
  },
] as const

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    pending: 'Submitted',
    verified: 'Received',
    rejected: 'Declined',
    approved: 'Approved',
    defaulted: 'Delayed',
    repaid: 'Paid',
    disbursed: 'Received',
    partially_paid: 'Partially paid',
    waived: 'Waived',
    due: 'Due',
    due_soon: 'Due soon',
    ongoing: 'Ongoing',
    not_applicable: 'Not applicable',
  }
  return labels[status] ?? status.replaceAll('_', ' ')
}

function StatusPill({ status }: { status: string }) {
  const good = ['active', 'verified', 'received', 'paid', 'disbursed'].includes(status)
  const waiting = ['pending', 'approved', 'partially_paid', 'due', 'due_soon', 'ongoing'].includes(
    status,
  )
  const neutral = status === 'not_applicable'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
        good
          ? 'bg-emerald-50 text-emerald-700'
          : waiting
            ? 'bg-amber-50 text-amber-700'
            : neutral
              ? 'bg-slate-100 text-slate-500'
              : 'bg-rose-50 text-rose-700'
      }`}
    >
      {statusLabel(status)}
    </span>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] backdrop-blur-xl sm:p-6 ${className}`}
    >
      {children}
    </section>
  )
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof CircleDollarSign
}) {
  return (
    <article className="min-w-0 rounded-[22px] border border-indigo-100/75 bg-white/90 p-4 shadow-[0_14px_40px_-34px_rgba(36,55,245,0.45)] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold leading-snug text-slate-500">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#7B3FF2]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 break-words font-heading text-xl font-extrabold tracking-tight text-[#231044] sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{detail}</p>
    </article>
  )
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="font-heading text-base font-extrabold tracking-tight text-[#231044] sm:text-lg">
          {title}
        </h2>
        {detail && <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>}
      </div>
    </header>
  )
}

function loanPaymentStatus(loan: MemberPosition['loans'][number], today: string) {
  if (
    loan.status === 'repaid' ||
    (loan.outstanding_amount === 0 && loan.outstanding_interest === 0)
  ) {
    return 'paid'
  }
  if (loan.status === 'pending') return 'pending'
  if (loan.status === 'approved') return 'approved'
  if (loan.status === 'rejected') return 'rejected'
  if (!loan.due_date) return 'ongoing'
  if (loan.due_date < today) return 'delayed'
  if (loan.due_date === today) return 'due'
  const daysUntilDue = Math.ceil(
    (Date.parse(`${loan.due_date}T00:00:00`) - Date.parse(`${today}T00:00:00`)) / 86_400_000,
  )
  return daysUntilDue <= 7 ? 'due_soon' : 'ongoing'
}

type PersonalTransaction = {
  id: string
  date: string
  type: string
  detail: string
  amount: number
  status: string
  reference: string | null
}

function buildTransactions(position: MemberPosition): PersonalTransaction[] {
  const contributions = position.contributions.map((item) => ({
    id: `contribution-${item.id}`,
    date: item.received_at ?? item.created_at,
    type: 'Contribution',
    detail: `${item.contribution_type.replaceAll('_', ' ')} · ${item.period.slice(0, 7)}`,
    amount: item.amount,
    status: item.status,
    reference: item.reference,
  }))
  const repayments = position.repayments.map((item) => ({
    id: `repayment-${item.id}`,
    date: item.received_at,
    type: 'Loan repayment',
    detail: `Principal ${formatMoney(item.principal_amount, position.group.currency)} · Interest ${formatMoney(item.interest_amount, position.group.currency)}`,
    amount: item.amount,
    status: item.status,
    reference: item.reference,
  }))
  const shares = position.shares.map((item) => ({
    id: `share-${item.id}`,
    date: item.created_at,
    type: item.direction === 'purchase' ? 'Share purchase' : 'Share sale',
    detail: `${Number(item.units).toLocaleString()} unit${Number(item.units) === 1 ? '' : 's'} · ${formatMoney(item.unit_price, position.group.currency)} per unit`,
    amount: item.amount,
    status: item.status,
    reference: item.reference,
  }))
  const loanRequests = position.loans.map((item) => ({
    id: `loan-${item.id}`,
    date: item.disbursed_at ?? item.created_at,
    type: item.disbursed_at ? 'Loan disbursement' : 'Loan request',
    detail: item.purpose,
    amount: item.principal,
    status: item.disbursed_at ? 'verified' : item.status,
    reference: null,
  }))
  return [...contributions, ...repayments, ...shares, ...loanRequests]
    .sort((first, second) => Date.parse(second.date) - Date.parse(first.date))
    .slice(0, 500)
}

function downloadStatement(position: MemberPosition, transactions: PersonalTransaction[]) {
  const rows = [
    ['Date', 'Type', 'Description', 'Amount', 'Status', 'Reference'],
    ...transactions.map((row) => [
      row.date,
      row.type,
      row.detail,
      `${row.amount} ${position.group.currency}`,
      statusLabel(row.status),
      row.reference ?? '',
    ]),
  ]
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell)
          const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value
          return `"${safeValue.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${position.group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-my-statement.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function MemberWorkspace({
  section,
  preferredGroupId,
  groups: initialGroups,
}: {
  section: MemberArea
  preferredGroupId?: string
  groups?: Array<{ id: string; name: string }>
}) {
  const allowedGroupIds = initialGroups?.map((item) => item.id)
  const {
    groups,
    group,
    loading: groupsLoading,
    error: groupsError,
  } = useActiveGroup(preferredGroupId, allowedGroupIds)
  const [positionState, setPositionState] = useState<{
    groupId: string
    position: MemberPosition | null
  } | null>(null)
  const position = group && positionState?.groupId === group.id ? positionState.position : null
  const loading = Boolean(group && positionState?.groupId !== group.id)
  const [error, setError] = useState('')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareSubmitting, setShareSubmitting] = useState(false)
  const [shareError, setShareError] = useState('')
  const [repaymentLoan, setRepaymentLoan] = useState<MemberPosition['loans'][number] | null>(null)
  const [repaymentSubmitting, setRepaymentSubmitting] = useState(false)
  const [repaymentError, setRepaymentError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const requestVersion = useRef(0)

  const loadPosition = useCallback(async () => {
    if (!group) return
    const requestId = ++requestVersion.current
    try {
      const next = await apiRequest<MemberPosition>(
        `/api/member/position?group_id=${encodeURIComponent(group.id)}`,
      )
      if (requestVersion.current === requestId) {
        setPositionState({ groupId: group.id, position: next })
        setError('')
      }
    } catch (cause) {
      if (requestVersion.current === requestId) {
        setPositionState({ groupId: group.id, position: null })
        setError(cause instanceof Error ? cause.message : 'Unable to load your group position.')
      }
    }
  }, [group])

  async function submitSharePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!position?.cycle) return
    const form = new FormData(event.currentTarget)
    setShareSubmitting(true)
    setShareError('')
    setActionNotice('')
    try {
      await apiRequest('/api/operations', {
        method: 'POST',
        body: JSON.stringify({
          action: 'record_share',
          group_id: position.group.id,
          cycle_id: position.cycle.id,
          member_id: position.member.id,
          direction: 'purchase',
          units: Number(form.get('units')),
          unit_price: position.cycle.share_price,
          reference: String(form.get('reference') ?? '').trim() || null,
        }),
      })
      setShareDialogOpen(false)
      setActionNotice(
        'Share purchase submitted. It will appear as received after an authorized person verifies it.',
      )
      await loadPosition()
    } catch (cause) {
      setShareError(
        cause instanceof Error ? cause.message : 'Unable to submit this share purchase.',
      )
    } finally {
      setShareSubmitting(false)
    }
  }

  async function submitLoanRepayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!repaymentLoan) return
    const form = new FormData(event.currentTarget)
    setRepaymentSubmitting(true)
    setRepaymentError('')
    setActionNotice('')
    try {
      await apiRequest(`/api/loans/${repaymentLoan.id}/repayments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.get('amount')),
          payment_method: String(form.get('payment_method')),
          reference: String(form.get('reference') ?? '').trim() || null,
        }),
      })
      setRepaymentLoan(null)
      setActionNotice(
        'Repayment submitted for receipt confirmation. Your balance changes after it is verified.',
      )
      await loadPosition()
    } catch (cause) {
      setRepaymentError(cause instanceof Error ? cause.message : 'Unable to submit this repayment.')
    } finally {
      setRepaymentSubmitting(false)
    }
  }

  useEffect(() => {
    if (!group) return
    let active = true
    const requestId = ++requestVersion.current
    apiRequest<MemberPosition>(`/api/member/position?group_id=${encodeURIComponent(group.id)}`)
      .then((next) => {
        if (!active || requestVersion.current !== requestId) return
        setPositionState({ groupId: group.id, position: next })
        setError('')
      })
      .catch((cause: unknown) => {
        if (!active || requestVersion.current !== requestId) return
        setPositionState({ groupId: group.id, position: null })
        setError(cause instanceof Error ? cause.message : 'Unable to load your group position.')
      })
    return () => {
      active = false
      requestVersion.current += 1
    }
  }, [group])

  const viewGroups = initialGroups?.length ? initialGroups : groups
  const transactions = useMemo(() => (position ? buildTransactions(position) : []), [position])
  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = today.slice(0, 7)

  if (groupsLoading || loading) {
    return (
      <>
        <DashboardHeader title="My group space" description="Your personal financial position" />
        <main className="mx-auto max-w-6xl p-5 sm:p-8" aria-live="polite">
          <p className="rounded-2xl border border-indigo-100 bg-white/80 p-5 text-sm text-slate-500">
            Loading your personal records…
          </p>
        </main>
      </>
    )
  }

  if (groupsError || error || !position) {
    return (
      <>
        <DashboardHeader title="My group space" description="Personal records and membership" />
        <main className="mx-auto max-w-4xl p-5 sm:p-8">
          <EmptyState
            title={
              groupsError ? 'Group information is unavailable' : 'No personal membership found'
            }
            description={
              groupsError ??
              error ??
              'This account is not registered as a member of the selected group.'
            }
            action={
              <Link
                href="/dashboard/settings/profile"
                className="inline-flex items-center gap-2 rounded-xl bg-[#6f25df] px-4 py-2.5 text-xs font-bold text-white"
              >
                Review my profile <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        </main>
      </>
    )
  }

  const contributions = position.contributions
  const loans = position.loans
  const verifiedContributions = contributions.filter((item) => item.status === 'verified')
  const regularSavings = verifiedContributions
    .filter((item) => item.contribution_type !== 'social')
    .reduce((total, item) => total + Number(item.amount), 0)
  const socialContributions = verifiedContributions
    .filter((item) => item.contribution_type === 'social')
    .reduce((total, item) => total + Number(item.amount), 0)
  const totalReceived = verifiedContributions.reduce(
    (total, item) => total + Number(item.amount),
    0,
  )
  const pendingContributions = contributions
    .filter((item) => item.status === 'pending')
    .reduce((total, item) => total + Number(item.amount), 0)
  const monthContributions = contributions.filter((item) => item.period.startsWith(currentMonth))
  const monthReceived = monthContributions
    .filter((item) => item.status === 'verified' && item.contribution_type !== 'special')
    .reduce((total, item) => total + Number(item.amount), 0)
  const monthSubmitted = monthContributions
    .filter((item) => item.status === 'pending' && item.contribution_type !== 'special')
    .reduce((total, item) => total + Number(item.amount), 0)
  const monthRegularSubmitted = monthContributions
    .filter((item) => item.status === 'pending' && item.contribution_type === 'regular')
    .reduce((total, item) => total + Number(item.amount), 0)
  const monthSocialSubmitted = monthContributions
    .filter((item) => item.status === 'pending' && item.contribution_type === 'social')
    .reduce((total, item) => total + Number(item.amount), 0)
  const currentObligation = position.obligations.find((item) =>
    item.period.startsWith(currentMonth),
  )
  const configuredSocial = Number(
    position.cycle?.rules.social_contribution_amount ??
      position.cycle?.rules.socialContributionAmount ??
      0,
  )
  const regularExpected = Number(
    currentObligation?.amount_due ??
      position.cycle?.contribution_amount ??
      position.group.contribution_amount,
  )
  const totalExpected = regularExpected + (Number.isFinite(configuredSocial) ? configuredSocial : 0)
  const dueDay = position.cycle?.contribution_due_day ?? 5
  const dueDate =
    currentObligation?.due_on ??
    (position.cycle ? `${currentMonth}-${String(dueDay).padStart(2, '0')}` : null)
  const currentRegularReceived = monthContributions
    .filter((item) => item.status === 'verified' && item.contribution_type === 'regular')
    .reduce((total, item) => total + Number(item.amount), 0)
  const currentSocialReceived = monthContributions
    .filter((item) => item.status === 'verified' && item.contribution_type === 'social')
    .reduce((total, item) => total + Number(item.amount), 0)
  const hasMonthlyPlan = Boolean(
    position.cycle || position.group.contribution_frequency === 'monthly',
  )
  const contributionStatus = !hasMonthlyPlan
    ? 'not_applicable'
    : currentRegularReceived >= regularExpected
      ? 'received'
      : dueDate && dueDate < today
        ? 'delayed'
        : dueDate === today
          ? 'due'
          : currentRegularReceived + monthRegularSubmitted > 0
            ? 'pending'
            : dueDate
              ? 'due'
              : 'ongoing'
  const socialStatus =
    configuredSocial <= 0
      ? currentSocialReceived > 0
        ? 'received'
        : monthSocialSubmitted > 0
          ? 'pending'
          : 'not_applicable'
      : monthContributions.some(
            (item) => item.contribution_type === 'social' && item.status === 'verified',
          )
        ? 'received'
        : dueDate && dueDate < today
          ? 'delayed'
          : dueDate === today
            ? 'due'
            : monthSocialSubmitted > 0
              ? 'pending'
              : dueDate
                ? 'due'
                : 'ongoing'
  const shareRows = position.shares.filter((item) => item.status === 'verified')
  const ownedUnits = shareRows.reduce(
    (total, item) => total + (item.direction === 'purchase' ? 1 : -1) * Number(item.units),
    0,
  )
  const shareValue = shareRows.reduce(
    (total, item) => total + (item.direction === 'purchase' ? 1 : -1) * Number(item.amount),
    0,
  )
  const repaidPrincipal = position.repayments
    .filter((item) => item.status === 'verified')
    .reduce((total, item) => total + Number(item.principal_amount), 0)
  const interestPaid = position.repayments
    .filter((item) => item.status === 'verified')
    .reduce((total, item) => total + Number(item.interest_amount), 0)
  const activeLoans = loans.filter((item) => ['active', 'defaulted'].includes(item.status))
  const borrowedPrincipal = loans
    .filter((item) => item.disbursed_at || ['active', 'defaulted', 'repaid'].includes(item.status))
    .reduce((total, item) => total + Number(item.principal), 0)
  const principalOutstanding = activeLoans.reduce(
    (total, item) => total + Number(item.outstanding_amount),
    0,
  )
  const interestOutstanding = activeLoans.reduce(
    (total, item) => total + Number(item.outstanding_interest),
    0,
  )
  const recordedContributionOutstanding = position.obligations
    .filter((item) => item.status !== 'paid' && item.status !== 'waived')
    .reduce((total, item) => {
      const linkedReceived = contributions
        .filter(
          (record) =>
            record.status === 'verified' &&
            record.contribution_type === 'regular' &&
            (record.obligation_id === item.id ||
              (!record.obligation_id && record.period.startsWith(item.period.slice(0, 7)))),
        )
        .reduce((sum, record) => sum + Number(record.amount), 0)
      return (
        total + Math.max(Number(item.amount_due) + Number(item.penalty_amount) - linkedReceived, 0)
      )
    }, 0)
  const currentExpectedOutstanding = hasMonthlyPlan
    ? Math.max(regularExpected - currentRegularReceived, 0) +
      Math.max(configuredSocial - currentSocialReceived, 0)
    : 0
  const contributionOutstanding =
    recordedContributionOutstanding +
    (currentObligation
      ? Math.max(configuredSocial - currentSocialReceived, 0)
      : currentExpectedOutstanding)
  const totalOutstanding = contributionOutstanding + principalOutstanding + interestOutstanding
  const memberTransactionRows = transactions
  const roleSet = [...new Set(position.roles)]

  const pageTitle = {
    overview: 'My group position',
    savings: 'My savings and shares',
    contributions: 'My contributions',
    loans: 'My loans and repayments',
    statements: 'My financial statements',
    communications: 'My communications with officials',
  }[section]
  const activeHref = personalLinks.find((item) => item.area === section)?.href ?? '/dashboard'
  const groupSelector =
    viewGroups.length > 1 ? (
      <GroupSelector groups={viewGroups} currentId={position.group.id} returnTo={activeHref} />
    ) : null

  const contributionRows = [...contributions].sort(
    (first, second) => Date.parse(second.period) - Date.parse(first.period),
  )
  const repaymentRows = [...position.repayments].sort(
    (first, second) => Date.parse(second.received_at) - Date.parse(first.received_at),
  )

  return (
    <>
      <DashboardHeader title={pageTitle} description={`${position.group.name} · Private to you`} />
      <main className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:space-y-6 sm:p-7 lg:p-8">
        <MemberGuide groupId={position.group.id} memberId={position.member.id} />
        {(position.systemControls.status !== 'normal' || position.systemControls.message) && (
          <aside role="status" className={`rounded-2xl border px-4 py-3 ${position.systemControls.status === 'locked' || position.systemControls.status === 'maintenance' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-indigo-200 bg-indigo-50 text-indigo-950'}`}>
            <p className="text-xs font-extrabold">group status: {position.systemControls.status}</p>
            {position.systemControls.message && <p className="mt-1 text-xs leading-relaxed">{position.systemControls.message}</p>}
            {position.systemControls.disabled_modules.length > 0 && <p className="mt-1 text-[10px] opacity-75">Some group actions are temporarily unavailable.</p>}
          </aside>
        )}
        {actionNotice && (
          <p
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
          >
            {actionNotice}
          </p>
        )}
        {section === 'overview' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7B3FF2]">
                  Your member space
                </p>
                <h2 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#231044] sm:text-3xl">
                  Welcome, {position.profileName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your savings, payments and obligations in {position.group.name}.
                </p>
              </div>
              {groupSelector}
            </div>

            <Panel className="overflow-hidden bg-gradient-to-br from-[#24134a] via-[#5431ad] to-[#813be8] text-white">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-violet-100">
                    My current position
                  </p>
                  <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                    {formatMoney(totalOutstanding, position.group.currency)}
                  </p>
                  <p className="mt-1 text-xs text-violet-100/85">
                    Current contributions, principal and interest still outstanding
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold">
                    <ShieldCheck className="h-3.5 w-3.5" /> Private member view
                  </span>
                  {position.cycle && (
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold">
                      {position.cycle.name}
                    </span>
                  )}
                </div>
              </div>
            </Panel>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Contributions received"
                value={formatMoney(totalReceived, position.group.currency)}
                detail={`${formatMoney(pendingContributions, position.group.currency)} submitted and awaiting confirmation`}
                icon={PiggyBank}
              />
              <Metric
                label="Shares owned"
                value={`${ownedUnits.toLocaleString()} units`}
                detail={`Recorded share value ${formatMoney(shareValue, position.group.currency)}`}
                icon={WalletCards}
              />
              <Metric
                label="Remaining loan principal"
                value={formatMoney(principalOutstanding, position.group.currency)}
                detail={`${formatMoney(interestOutstanding, position.group.currency)} interest currently outstanding`}
                icon={HandCoins}
              />
              <Metric
                label="Total amount outstanding"
                value={formatMoney(totalOutstanding, position.group.currency)}
                detail={`${formatMoney(contributionOutstanding, position.group.currency)} contribution obligations · ${formatMoney(principalOutstanding + interestOutstanding, position.group.currency)} loans`}
                icon={CircleDollarSign}
              />
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel>
                <SectionTitle
                  title={position.cycle ? "This month's payment" : 'Current contribution plan'}
                  detail={`Your ${position.cycle ? 'monthly cycle' : position.group.contribution_frequency} plan. See what you submitted and what the group confirmed.`}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/45 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Expected total
                    </p>
                    <p className="mt-1.5 font-heading text-xl font-extrabold text-[#231044]">
                      {formatMoney(totalExpected, position.group.currency)}
                    </p>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <p className="flex justify-between gap-2">
                        <span>Savings / shares</span>
                        <b>{formatMoney(regularExpected, position.group.currency)}</b>
                      </p>
                      <p className="flex justify-between gap-2">
                        <span>Social contribution</span>
                        <b>
                          {configuredSocial > 0
                            ? formatMoney(configuredSocial, position.group.currency)
                            : 'Not configured'}
                        </b>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Submitted</p>
                      <p className="mt-1 break-words text-sm font-extrabold text-[#231044]">
                        {formatMoney(monthSubmitted, position.group.currency)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50/70 p-3">
                      <p className="text-[9px] font-bold uppercase text-emerald-700/70">Received</p>
                      <p className="mt-1 break-words text-sm font-extrabold text-emerald-800">
                        {formatMoney(monthReceived, position.group.currency)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50/80 p-3">
                      <p className="text-[9px] font-bold uppercase text-amber-700/70">
                        Outstanding
                      </p>
                      <p className="mt-1 break-words text-sm font-extrabold text-amber-900">
                        {formatMoney(currentExpectedOutstanding, position.group.currency)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-indigo-50 pt-4 text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    Savings / shares <StatusPill status={contributionStatus} />
                  </span>
                  <span className="flex items-center gap-2 text-slate-600">
                    Social contribution <StatusPill status={socialStatus} />
                  </span>
                  {currentObligation && (
                    <span className="text-slate-400">
                      Due {formatDate(currentObligation.due_on)}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
                  A submitted amount is not counted as received until an authorized official records
                  it.
                </p>
              </Panel>

              <Panel>
                <SectionTitle
                  title="Membership"
                  detail="Your participation is separate from your assigned responsibilities."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Member number
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#231044]">
                      {position.member.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Status
                    </p>
                    <div className="mt-1">
                      <StatusPill status={position.member.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Member since
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#231044]">
                      {formatDate(position.member.joined_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Group
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#231044]">
                      {position.group.name}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-indigo-50 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                    Membership and assigned roles
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[10px] font-bold text-violet-700">
                      Member
                    </span>
                    {roleSet.map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold text-indigo-700"
                      >
                        {roleLabels[role as GroupRole] ?? role}
                      </span>
                    ))}
                    {!roleSet.length && (
                      <span className="text-[10px] text-slate-400">
                        No additional role assigned
                      </span>
                    )}
                  </div>
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle
                    title="My loans"
                    detail="Principal, interest and your next contractual due date."
                  />
                  <Link
                    href="/dashboard/my/loans"
                    className="shrink-0 text-xs font-bold text-[#6a36d9] hover:underline"
                  >
                    View all
                  </Link>
                </div>
                {loans.length ? (
                  <div className="divide-y divide-indigo-50">
                    {loans.slice(0, 4).map((loan) => (
                      <div
                        key={loan.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#231044]">
                            {loan.purpose}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            Principal remaining{' '}
                            {formatMoney(loan.outstanding_amount, position.group.currency)} ·
                            Interest{' '}
                            {formatMoney(loan.outstanding_interest, position.group.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill status={loanPaymentStatus(loan, today)} />
                          {loan.due_date && (
                            <span className="text-[10px] text-slate-400">
                              {formatDate(loan.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                    No loan requests or loans are recorded for you.
                  </p>
                )}
              </Panel>

              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle
                    title="Recent personal transactions"
                    detail="Only your own contributions, shares, loans and repayments."
                  />
                  <Link
                    href="/dashboard/my/statements"
                    className="shrink-0 text-xs font-bold text-[#6a36d9] hover:underline"
                  >
                    Statement
                  </Link>
                </div>
                <TransactionList
                  rows={memberTransactionRows.slice(0, 5)}
                  currency={position.group.currency}
                />
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <SectionTitle title="Official announcements" />
                {position.announcements.length ? (
                  <div className="space-y-3">
                    {position.announcements.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-indigo-50 bg-indigo-50/35 p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xs font-bold text-[#231044]">{item.title}</h3>
                          <span className="shrink-0 text-[9px] text-slate-400">
                            {formatDate(item.published_at)}
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                          {item.body}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    There are no published announcements for you.
                  </p>
                )}
              </Panel>
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle
                    title="My notifications"
                    detail="Payment confirmations, reminders and account updates."
                  />
                  <Link
                    href="/dashboard/notifications"
                    className="shrink-0 text-xs font-bold text-[#6a36d9] hover:underline"
                  >
                    All notices
                  </Link>
                </div>
                {position.notifications.length ? (
                  <div className="divide-y divide-indigo-50">
                    {position.notifications.slice(0, 4).map((item) => (
                      <Link
                        href={item.href ?? '/dashboard/notifications'}
                        key={item.id}
                        className="block py-3 first:pt-0 hover:bg-indigo-50/40"
                      >
                        <div className="flex items-start gap-2">
                          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7B3FF2]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#231044]">{item.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                              {item.body}
                            </p>
                          </div>
                          {!item.read_at && (
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500"
                              aria-label="Unread"
                            />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">You have no new account notices.</p>
                )}
              </Panel>
            </div>
            <Panel className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-sm font-extrabold text-[#231044]">
                  Need help with a personal record?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Send a private question to authorized group officials.
                </p>
              </div>
              <Link
                href="/dashboard/my/communications"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-bold text-violet-800 hover:bg-violet-100"
              >
                <MessageCircle className="h-4 w-4" /> Contact officials
              </Link>
            </Panel>
          </>
        )}

        {section === 'communications' && <MemberCommunications groupId={position.group.id} />}

        {section !== 'overview' && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7B3FF2]">
                {position.group.name}
              </p>
              <h2 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#231044]">
                {pageTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                These details belong to your membership account.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {groupSelector}
              {section === 'statements' && (
                <button
                  type="button"
                  onClick={() => downloadStatement(position, transactions)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6f25df] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 transition hover:bg-[#5d1ec2]"
                >
                  <ArrowDownToLine className="h-4 w-4" /> Download CSV
                </button>
              )}
            </div>
          </div>
        )}

        {section === 'savings' && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                label="Savings contributions received"
                value={formatMoney(regularSavings, position.group.currency)}
                detail="Verified regular and special contributions"
                icon={PiggyBank}
              />
              <Metric
                label="Social contributions received"
                value={formatMoney(socialContributions, position.group.currency)}
                detail="Shown separately from savings"
                icon={HeartHandshake}
              />
              <Metric
                label="Share ownership"
                value={`${ownedUnits.toLocaleString()} units`}
                detail={`Recorded value ${formatMoney(shareValue, position.group.currency)}`}
                icon={WalletCards}
              />
            </div>
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionTitle
                  title="Share history"
                  detail="Purchases and sales are counted only after they are officially verified."
                />
                <button
                  type="button"
                  onClick={() => {
                    setShareError('')
                    setShareDialogOpen(true)
                  }}
                  disabled={!position.cycle}
                  className="rounded-xl bg-[#6f25df] px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 transition hover:bg-[#5d1ec2] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  Request shares
                </button>
              </div>
              {!position.cycle && (
                <p className="mb-4 text-[10px] text-slate-400">
                  Share purchases open when the group starts a new cycle.
                </p>
              )}
              {position.shares.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Activity</th>
                        <th className="pb-3">Units</th>
                        <th className="pb-3">Unit value</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {position.shares.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 pr-4 text-slate-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="py-3 pr-4 font-semibold capitalize text-[#231044]">
                            {item.direction}
                          </td>
                          <td className="py-3 pr-4">{Number(item.units).toLocaleString()}</td>
                          <td className="py-3 pr-4">
                            {formatMoney(item.unit_price, position.group.currency)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatMoney(item.amount, position.group.currency)}
                          </td>
                          <td className="py-3">
                            <StatusPill status={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No share transactions have been recorded for you.
                </p>
              )}
            </Panel>
            <Panel>
              <SectionTitle title="Savings contribution history" />
              <ContributionTable rows={contributionRows} currency={position.group.currency} />
            </Panel>
          </>
        )}

        {section === 'contributions' && (
          <>
            <Panel>
              <SectionTitle
                title="Current payment breakdown"
                detail="A submission remains pending until the group confirms receipt."
              />
              <div className="grid gap-3 sm:grid-cols-4">
                <SimpleAmount
                  label="Expected total"
                  value={formatMoney(totalExpected, position.group.currency)}
                />
                <SimpleAmount
                  label="Submitted"
                  value={formatMoney(monthSubmitted, position.group.currency)}
                />
                <SimpleAmount
                  label="Officially received"
                  value={formatMoney(monthReceived, position.group.currency)}
                />
                <SimpleAmount
                  label="Still outstanding"
                  value={formatMoney(currentExpectedOutstanding, position.group.currency)}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
                <span>
                  Savings / shares: {formatMoney(regularExpected, position.group.currency)} ·{' '}
                  <StatusPill status={contributionStatus} />
                </span>
                <span>
                  Social:{' '}
                  {configuredSocial > 0
                    ? formatMoney(configuredSocial, position.group.currency)
                    : 'Not configured'}{' '}
                  · <StatusPill status={socialStatus} />
                </span>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
                The currently configured cycle has no separate social-contribution amount unless
                shown above.
              </p>
              <Link
                href="/dashboard/contributions/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#6f25df] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-[#5d1ec2]"
              >
                Submit a contribution <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Panel>
            <Panel>
              <SectionTitle title="All your contributions" />
              <ContributionTable rows={contributionRows} currency={position.group.currency} />
            </Panel>
          </>
        )}

        {section === 'loans' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Total principal borrowed"
                value={formatMoney(borrowedPrincipal, position.group.currency)}
                detail="Loans issued to you"
                icon={HandCoins}
              />
              <Metric
                label="Principal repaid"
                value={formatMoney(repaidPrincipal, position.group.currency)}
                detail="Verified repayments only"
                icon={CreditCard}
              />
              <Metric
                label="Interest paid"
                value={formatMoney(interestPaid, position.group.currency)}
                detail="Verified interest portion"
                icon={CircleDollarSign}
              />
              <Metric
                label="Current loan balance"
                value={formatMoney(
                  principalOutstanding + interestOutstanding,
                  position.group.currency,
                )}
                detail={`Principal ${formatMoney(principalOutstanding, position.group.currency)} + interest ${formatMoney(interestOutstanding, position.group.currency)}`}
                icon={CalendarClock}
              />
            </div>
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle
                  title="My loan requests and loans"
                  detail="Your account cannot approve its own loan or change approved terms."
                />
                <Link
                  href="/dashboard/loans/apply"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6f25df] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-[#5d1ec2]"
                >
                  Apply for a loan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {loans.length ? (
                <div className="space-y-3">
                  {loans.map((loan) => {
                    const loanRepayments = repaymentRows.filter((item) => item.loan_id === loan.id)
                    const paidPrincipal = loanRepayments
                      .filter((item) => item.status === 'verified')
                      .reduce((sum, item) => sum + Number(item.principal_amount), 0)
                    const paidInterest = loanRepayments
                      .filter((item) => item.status === 'verified')
                      .reduce((sum, item) => sum + Number(item.interest_amount), 0)
                    return (
                      <article
                        key={loan.id}
                        className="rounded-2xl border border-indigo-100/80 bg-white p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-heading text-sm font-extrabold text-[#231044]">
                              {loan.purpose}
                            </h3>
                            <p className="mt-1 text-[10px] text-slate-400">
                              Requested {formatDate(loan.created_at)} · {loan.interest_rate}% ·{' '}
                              {loan.term_months} months
                            </p>
                          </div>
                          <StatusPill status={loanPaymentStatus(loan, today)} />
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-5">
                          <SimpleAmount
                            label="Original principal"
                            value={formatMoney(loan.principal, position.group.currency)}
                          />
                          <SimpleAmount
                            label="Principal repaid"
                            value={formatMoney(paidPrincipal, position.group.currency)}
                          />
                          <SimpleAmount
                            label="Interest paid"
                            value={formatMoney(paidInterest, position.group.currency)}
                          />
                          <SimpleAmount
                            label="Principal remaining"
                            value={formatMoney(loan.outstanding_amount, position.group.currency)}
                          />
                          <SimpleAmount
                            label="Interest due"
                            value={formatMoney(loan.outstanding_interest, position.group.currency)}
                          />
                        </div>
                        {loan.due_date && (
                          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Clock3 className="h-3.5 w-3.5 text-[#7B3FF2]" /> Contractual due date{' '}
                            {formatDate(loan.due_date)}
                          </p>
                        )}
                        {loanRepayments.length > 0 && (
                          <p className="mt-2 text-[10px] text-slate-500">
                            {loanRepayments.length} repayment record
                            {loanRepayments.length === 1 ? '' : 's'} ·{' '}
                            {loanRepayments.filter((item) => item.status === 'pending').length}{' '}
                            waiting for receipt confirmation
                          </p>
                        )}
                        {position.interestCharges.some((charge) => charge.loan_id === loan.id) && (
                          <details className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-2">
                            <summary className="cursor-pointer text-[11px] font-bold text-[#4e3478]">
                              Recorded interest periods (
                              {
                                position.interestCharges.filter(
                                  (charge) => charge.loan_id === loan.id,
                                ).length
                              }
                              )
                            </summary>
                            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                              These are the interest charges recorded for your loan. The unpaid
                              total above reflects the current outstanding interest balance.
                            </p>
                            <div className="mt-2 divide-y divide-indigo-100">
                              {position.interestCharges
                                .filter((charge) => charge.loan_id === loan.id)
                                .map((charge) => (
                                  <div
                                    key={charge.id}
                                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-[10px]"
                                  >
                                    <span className="text-slate-500">
                                      {charge.period.slice(0, 7)} · due {formatDate(charge.due_on)}
                                    </span>
                                    <span className="font-bold text-[#231044]">
                                      {formatMoney(charge.amount, position.group.currency)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </details>
                        )}
                        {['active', 'defaulted'].includes(loan.status) &&
                          Number(loan.outstanding_amount) + Number(loan.outstanding_interest) >
                            0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setRepaymentError('')
                                setRepaymentLoan(loan)
                              }}
                              className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-[11px] font-bold text-violet-800 transition hover:bg-violet-100"
                            >
                              Submit a repayment
                            </button>
                          )}
                      </article>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No loan requests or loans are recorded for you.
                </p>
              )}
            </Panel>
            <Panel>
              <SectionTitle
                title="Repayment history"
                detail="Principal and interest are separated on each payment."
              />
              <TransactionList
                rows={transactions.filter((row) => row.type === 'Loan repayment')}
                currency={position.group.currency}
              />
            </Panel>
            {position.socialRequests.length > 0 && (
              <Panel>
                <SectionTitle title="Social-fund assistance requests" />
                <div className="divide-y divide-indigo-50">
                  {position.socialRequests.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#231044]">{item.reason}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Requested {formatDate(item.created_at)}
                          {item.disbursement_reference
                            ? ` · Ref ${item.disbursement_reference}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <b className="text-xs">
                          {formatMoney(item.amount_requested, position.group.currency)}
                        </b>
                        <StatusPill status={item.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}

        {section === 'statements' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="All contributions received"
                value={formatMoney(totalReceived, position.group.currency)}
                detail={`${formatMoney(pendingContributions, position.group.currency)} still pending`}
                icon={PiggyBank}
              />
              <Metric
                label="Share value"
                value={formatMoney(shareValue, position.group.currency)}
                detail={`${ownedUnits.toLocaleString()} owned units`}
                icon={WalletCards}
              />
              <Metric
                label="Principal repaid"
                value={formatMoney(repaidPrincipal, position.group.currency)}
                detail={`Interest paid ${formatMoney(interestPaid, position.group.currency)}`}
                icon={CreditCard}
              />
              <Metric
                label="Outstanding obligations"
                value={formatMoney(totalOutstanding, position.group.currency)}
                detail="Contributions, remaining principal and interest"
                icon={CircleDollarSign}
              />
            </div>
            <Panel>
              <SectionTitle
                title="Personal transaction statement"
                detail="CSV includes your personal transactions and their recorded status."
              />
              <TransactionTable rows={transactions} currency={position.group.currency} />
            </Panel>
          </>
        )}
      </main>
      <Modal
        open={shareDialogOpen}
        title="Request a share purchase"
        onClose={() => setShareDialogOpen(false)}
      >
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          Your request is recorded as pending until an authorized official verifies payment. Current
          cycle share price:{' '}
          {formatMoney(position.cycle?.share_price ?? 0, position.group.currency)} per unit.
        </p>
        <form onSubmit={(event) => void submitSharePurchase(event)} className="grid gap-4">
          <FormError message={shareError} />
          <FormField htmlFor="member-share-units" label="Units to purchase">
            <Input
              id="member-share-units"
              name="units"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </FormField>
          <FormField htmlFor="member-share-reference" label="Payment reference (optional)">
            <Input id="member-share-reference" name="reference" maxLength={160} />
          </FormField>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShareDialogOpen(false)}
              className="rounded-xl border border-indigo-100 px-4 py-2.5 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={shareSubmitting || !position.cycle}
              className="rounded-xl bg-[#6f25df] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {shareSubmitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(repaymentLoan)}
        title="Submit a loan repayment"
        onClose={() => setRepaymentLoan(null)}
      >
        {repaymentLoan && (
          <form onSubmit={(event) => void submitLoanRepayment(event)} className="grid gap-4">
            <p className="text-xs leading-relaxed text-slate-500">
              Your payment will be submitted for confirmation. The system applies verified payments
              to outstanding interest first, then principal. Current total balance:{' '}
              {formatMoney(
                Number(repaymentLoan.outstanding_amount) +
                  Number(repaymentLoan.outstanding_interest),
                position.group.currency,
              )}
              .
            </p>
            <FormError message={repaymentError} />
            <FormField
              htmlFor="member-repayment-amount"
              label={`Payment amount (${position.group.currency})`}
            >
              <Input
                id="member-repayment-amount"
                name="amount"
                type="number"
                min="1"
                max={
                  Number(repaymentLoan.outstanding_amount) +
                  Number(repaymentLoan.outstanding_interest)
                }
                step="1"
                required
              />
            </FormField>
            <FormField htmlFor="member-repayment-method" label="Payment method">
              <Select id="member-repayment-method" name="payment_method">
                <option value="mobile_money">Mobile money</option>
                <option value="bank">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
            <FormField htmlFor="member-repayment-reference" label="Payment reference (optional)">
              <Input id="member-repayment-reference" name="reference" maxLength={160} />
            </FormField>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRepaymentLoan(null)}
                className="rounded-xl border border-indigo-100 px-4 py-2.5 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={repaymentSubmitting}
                className="rounded-xl bg-[#6f25df] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {repaymentSubmitting ? 'Submitting…' : 'Submit repayment'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

function SimpleAmount({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[9px] font-bold leading-snug text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-extrabold text-[#231044]">{value}</p>
    </div>
  )
}

function ContributionTable({
  rows,
  currency,
}: {
  rows: MemberPosition['contributions']
  currency: string
}) {
  if (!rows.length)
    return <p className="text-xs text-slate-400">No contributions have been recorded for you.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[660px] text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="pb-3">Period</th>
            <th className="pb-3">Component</th>
            <th className="pb-3">Amount</th>
            <th className="pb-3">Received / submitted</th>
            <th className="pb-3">Reference</th>
            <th className="pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-indigo-50">
          {rows.map((item) => (
            <tr key={item.id}>
              <td className="py-3 pr-4">{item.period.slice(0, 7)}</td>
              <td className="py-3 pr-4 capitalize">
                {item.contribution_type.replaceAll('_', ' ')}
              </td>
              <td className="py-3 pr-4 font-bold">{formatMoney(item.amount, currency)}</td>
              <td className="py-3 pr-4 text-slate-500">
                {formatDate(item.received_at ?? item.created_at)}
              </td>
              <td className="py-3 pr-4 text-slate-500">{item.reference ?? '—'}</td>
              <td className="py-3">
                <StatusPill status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TransactionList({ rows, currency }: { rows: PersonalTransaction[]; currency: string }) {
  if (!rows.length)
    return (
      <p className="py-3 text-center text-xs text-slate-400">
        No personal transactions have been recorded.
      </p>
    )
  return (
    <div className="divide-y divide-indigo-50">
      {rows.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#231044]">{item.type}</p>
            <p className="mt-1 truncate text-[10px] text-slate-400">
              {item.detail} · {formatDate(item.date)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-extrabold text-[#231044]">
              {formatMoney(item.amount, currency)}
            </p>
            <span className="mt-1 inline-flex">
              <StatusPill status={item.status} />
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function TransactionTable({ rows, currency }: { rows: PersonalTransaction[]; currency: string }) {
  if (!rows.length)
    return (
      <p className="text-xs text-slate-400">
        Your statement will appear here when transactions are recorded.
      </p>
    )
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[740px] text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="pb-3">Date</th>
            <th className="pb-3">Transaction</th>
            <th className="pb-3">Details</th>
            <th className="pb-3">Amount</th>
            <th className="pb-3">Reference</th>
            <th className="pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-indigo-50">
          {rows.map((item) => (
            <tr key={item.id}>
              <td className="py-3 pr-4 text-slate-500">{formatDate(item.date)}</td>
              <td className="py-3 pr-4 font-semibold text-[#231044]">{item.type}</td>
              <td className="max-w-64 py-3 pr-4 text-slate-500">{item.detail}</td>
              <td className="py-3 pr-4 font-bold">{formatMoney(item.amount, currency)}</td>
              <td className="py-3 pr-4 text-slate-500">{item.reference ?? '—'}</td>
              <td className="py-3">
                <StatusPill status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
