import Link from 'next/link'
import type { Group } from '@/types/group'
import { formatMoney } from '@/lib/formatters'
export function GroupCard({ group }: { group: Group }) {
  return <Link href={`/dashboard?group=${group.id}`} className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"><h2 className="font-semibold text-slate-900">{group.name}</h2><p className="mt-1 text-sm text-slate-500">{group.contribution_frequency} · {formatMoney(group.contribution_amount, group.currency)}</p></Link>
}
