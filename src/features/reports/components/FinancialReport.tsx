import { DataTable } from '@/components/tables/DataTable'
import { formatMoney } from '@/lib/formatters'
import type { FinancialReportRow } from '@/types/report'

export function FinancialReport({ rows, currency = 'RWF' }: { rows: FinancialReportRow[]; currency?: string }) {
  return <DataTable rows={rows} rowKey="period" columns={[
    { key: 'period', label: 'Period' },
    { key: 'contributions', label: 'Savings contributions', render: (row) => formatMoney(row.contributions, currency) },
    { key: 'social_contributions', label: 'Social contributions', render: (row) => formatMoney(row.social_contributions, currency) },
    { key: 'repayments', label: 'Repayments', render: (row) => formatMoney(row.repayments, currency) },
    { key: 'interest_collected', label: 'Interest collected', render: (row) => formatMoney(row.interest_collected, currency) },
    { key: 'loans_issued', label: 'Loans issued', render: (row) => formatMoney(row.loans_issued, currency) },
    { key: 'expenses', label: 'Group expenses', render: (row) => formatMoney(row.expenses, currency) },
    { key: 'social_expenses', label: 'Social-fund expenses', render: (row) => formatMoney(row.social_expenses, currency) },
    { key: 'social_disbursements', label: 'Social assistance', render: (row) => formatMoney(row.social_disbursements, currency) },
    { key: 'social_fund_closing_balance', label: 'Social-fund balance', render: (row) => formatMoney(row.social_fund_closing_balance, currency) },
    { key: 'net_share_activity', label: 'Net share activity', render: (row) => formatMoney(row.net_share_activity, currency) },
    { key: 'closing_balance', label: 'Closing available balance', render: (row) => formatMoney(row.closing_balance, currency) },
  ]} />
}
