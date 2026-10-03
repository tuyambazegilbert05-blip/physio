import type { Loan } from '@/types/loan'
import { formatMoney } from '@/lib/formatters'
export function LoanSummary({ loans, currency = 'RWF' }: { loans: Loan[]; currency?: string }) {
  const outstanding = loans.filter((loan) => ['approved', 'active', 'defaulted'].includes(loan.status)).reduce((total, loan) => total + loan.outstanding_amount, 0)
  const review = loans.filter((loan) => loan.status === 'pending').length
  return <dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-white p-5"><dt className="text-sm text-slate-500">Outstanding balance</dt><dd className="mt-1 text-xl font-semibold">{formatMoney(outstanding, currency)}</dd></div><div className="rounded-lg bg-white p-5"><dt className="text-sm text-slate-500">Applications awaiting review</dt><dd className="mt-1 text-xl font-semibold">{review}</dd></div></dl>
}
