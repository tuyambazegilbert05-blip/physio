import type { Contribution } from '@/types/contribution'
import { formatMoney } from '@/lib/formatters'
export function ContributionSummary({ items, currency = 'RWF' }: { items: Contribution[]; currency?: string }) {
  const verified = items.filter((item) => item.status === 'verified').reduce((total, item) => total + item.amount, 0)
  const pending = items.filter((item) => item.status === 'pending').length
  return <dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-white p-5"><dt className="text-sm text-slate-500">Verified contributions</dt><dd className="mt-1 text-xl font-semibold">{formatMoney(verified, currency)}</dd></div><div className="rounded-lg bg-white p-5"><dt className="text-sm text-slate-500">Awaiting review</dt><dd className="mt-1 text-xl font-semibold">{pending}</dd></div></dl>
}
