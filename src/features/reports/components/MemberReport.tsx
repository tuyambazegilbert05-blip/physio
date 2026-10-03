import { DataTable } from '@/components/tables/DataTable'
import { formatMoney, formatPercent } from '@/lib/formatters'
import type { MemberReportRow } from '@/types/report'
export function MemberReport({ rows, currency = 'RWF' }: { rows: MemberReportRow[]; currency?: string }) {
  return <DataTable rows={rows} rowKey="member_id" columns={[{ key: 'full_name', label: 'Member' }, { key: 'contributions_total', label: 'Contributions', render: (row) => formatMoney(row.contributions_total, currency) }, { key: 'loans_outstanding', label: 'Loans outstanding', render: (row) => formatMoney(row.loans_outstanding, currency) }, { key: 'attendance_rate', label: 'Attendance', render: (row) => formatPercent(row.attendance_rate) }]} />
}
