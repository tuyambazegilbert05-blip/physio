import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/Badge'
import { formatMoney, formatDate } from '@/lib/formatters'
import type { Contribution } from '@/types/contribution'
export function ContributionTable({ contributions, currency = 'RWF' }: { contributions: Contribution[]; currency?: string }) {
  return <DataTable rows={contributions} rowKey="id" columns={[{ key: 'period', label: 'Period', render: (row) => formatDate(row.period) }, { key: 'contribution_type', label: 'Type' }, { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount, currency) }, { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> }, { key: 'created_at', label: 'Recorded', render: (row) => formatDate(row.created_at) }]} />
}
