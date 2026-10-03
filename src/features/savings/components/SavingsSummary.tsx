import type { SavingsSummary as Summary } from '@/types/savings'
import { formatMoney } from '@/lib/formatters'
export function SavingsSummary({ summary }: { summary: Summary }) {
  const cards = [
    ['Total contributions', summary.total_contributions],
    ['Loans outstanding', summary.total_loans_outstanding],
    ['Interest collected', summary.interest_collected],
    ['Group expenses', summary.group_expenses],
    ['Social fund balance', summary.social_fund_balance],
    ['Share value', summary.share_value],
    ['Reserve balance', summary.reserve_balance],
    ['Available balance', summary.available_balance],
  ] as const
  return <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, amount]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-2 text-xl font-semibold">{formatMoney(amount, summary.currency)}</dd></div>)}</dl>
}
