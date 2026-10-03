import type { Loan } from '@/types/loan'
import { formatMoney, formatDate } from '@/lib/formatters'
export function LoanCard({ loan, currency = 'RWF' }: { loan: Loan; currency?: string }) {
  return <article className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><strong>{formatMoney(loan.principal, currency)}</strong><span className="text-sm capitalize text-slate-600">{loan.status}</span></div><p className="mt-2 text-sm text-slate-700">{loan.purpose}</p><p className="mt-2 text-xs text-slate-500">{loan.term_months} months · {loan.due_date ? `Due ${formatDate(loan.due_date)}` : 'Awaiting approval'}{loan.rejection_reason ? ` · ${loan.rejection_reason}` : ''}{loan.disbursement_reference ? ` · Ref ${loan.disbursement_reference}` : ''}</p></article>
}
