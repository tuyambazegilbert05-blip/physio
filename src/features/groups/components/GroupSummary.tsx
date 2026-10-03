import type { Group } from '@/types/group'
import { formatMoney } from '@/lib/formatters'
export function GroupSummary({ group }: { group: Group }) {
  return <dl className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3"><div><dt className="text-xs text-slate-500">Currency</dt><dd className="mt-1 font-medium">{group.currency}</dd></div><div><dt className="text-xs text-slate-500">Contribution</dt><dd className="mt-1 font-medium">{formatMoney(group.contribution_amount, group.currency)}</dd></div><div><dt className="text-xs text-slate-500">Frequency</dt><dd className="mt-1 font-medium capitalize">{group.contribution_frequency}</dd></div></dl>
}
