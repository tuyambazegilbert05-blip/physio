import { ArrowUpRight } from 'lucide-react'
import { formatDate, formatMoney } from '@/lib/formatters'
import type { Loan } from '@/types/loan'

const statusStyles: Record<string, string> = {
  pending: 'border-amber-100 bg-amber-50 text-amber-700',
  approved: 'border-sky-100 bg-sky-50 text-sky-700',
  active: 'border-purple-100 bg-purple-50 text-[#7B3FF2]',
  defaulted: 'border-rose-100 bg-rose-50 text-rose-700',
  repaid: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  rejected: 'border-slate-200 bg-slate-100 text-slate-500',
}

function initials(name: string) {
  return (
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'M'
  )
}

export function LoanCard({
  loan,
  currency = 'RWF',
  memberName = 'Group member',
  paidPrincipal = 0,
  onAction,
}: {
  loan: Loan
  currency?: string
  memberName?: string
  paidPrincipal?: number
  onAction?: () => void
}) {
  const progress =
    loan.principal > 0 ? Math.max(0, Math.min(100, (paidPrincipal / loan.principal) * 100)) : 0
  const segments = Math.min(6, Math.max(3, loan.term_months))
  const isDisbursed = ['active', 'defaulted'].includes(loan.status)
  const outstanding = isDisbursed
    ? loan.outstanding_amount + loan.outstanding_interest
    : loan.status === 'repaid'
      ? 0
      : loan.principal
  const balanceLabel = loan.is_draft
    ? 'Draft request'
    : isDisbursed
      ? 'Outstanding balance'
      : loan.status === 'approved'
        ? 'Approved amount'
        : loan.status === 'repaid'
          ? 'Outstanding balance'
          : loan.status === 'rejected'
            ? 'Requested amount'
            : 'Requested amount'
  const balanceNote = loan.is_draft
    ? 'Not submitted for review'
    : isDisbursed
      ? `of ${formatMoney(loan.principal, currency)} principal`
      : loan.status === 'approved'
        ? 'Awaiting disbursement'
        : loan.status === 'repaid'
          ? 'Paid in full'
          : loan.status === 'rejected'
            ? 'Application declined'
            : 'Awaiting review'

  return (
    <article className="group rounded-[25px] border border-white/90 bg-white/90 p-4 shadow-[0_18px_48px_-34px_rgba(83,55,220,0.38)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-[0_24px_54px_-34px_rgba(83,55,220,0.43)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2437F5] to-[#B026FF] text-[10px] font-extrabold text-white shadow-sm">
            {initials(memberName)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-extrabold text-[#231044]">{memberName}</h2>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">{loan.purpose}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-extrabold capitalize ${statusStyles[loan.status] ?? statusStyles.pending}`}
        >
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
          {loan.is_draft ? 'draft' : loan.status}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
            {balanceLabel}
          </p>
          <p className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#231044]">
            {formatMoney(outstanding, currency)}
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400">{balanceNote}</p>
        </div>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            aria-label={`Open actions for ${memberName}'s loan`}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-indigo-100 bg-white px-2.5 py-2 text-[10px] font-bold text-[#5A36E8] transition hover:border-violet-200 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B3FF2]"
          >
            Actions
            <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="mt-4" aria-label={`${Math.round(progress)}% of principal repaid`}>
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: segments }, (_, index) => {
            const segmentProgress = Math.max(0, Math.min(100, progress * segments - index * 100))
            return (
              <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEE5FB]">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-[#2437F5] to-[#B026FF]"
                  style={{ width: `${segmentProgress}%` }}
                />
              </span>
            )
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-slate-400">
          <span>{formatMoney(paidPrincipal, currency)} principal repaid</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-indigo-50 pt-3.5">
        <div>
          <dt className="text-[9px] font-semibold text-slate-400">Principal</dt>
          <dd className="mt-1 text-[11px] font-extrabold text-[#231044]">
            {formatMoney(loan.principal, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] font-semibold text-slate-400">Rate</dt>
          <dd className="mt-1 text-[11px] font-extrabold text-[#231044]">{loan.interest_rate}%</dd>
        </div>
        <div>
          <dt className="text-[9px] font-semibold text-slate-400">Next due</dt>
          <dd className="mt-1 truncate text-[11px] font-extrabold text-[#231044]">
            {loan.due_date ? formatDate(loan.due_date) : '—'}
          </dd>
        </div>
      </dl>
    </article>
  )
}
