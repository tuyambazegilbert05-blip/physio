import type { Contribution } from '@/types/contribution'
import { formatMoney, formatDate } from '@/lib/formatters'
export function ContributionCard({ contribution, currency = 'RWF' }: { contribution: Contribution; currency?: string }) {
  return <article className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"><div><p className="font-medium capitalize">{contribution.contribution_type} contribution</p><p className="mt-1 text-xs text-slate-500">{formatDate(contribution.period)} · {contribution.status}</p></div><strong>{formatMoney(contribution.amount, currency)}</strong></article>
}
