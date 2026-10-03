import { DataTable } from '@/components/tables/DataTable'
import { formatMoney, formatDate } from '@/lib/formatters'
import type { Loan } from '@/types/loan'
export function LoanTable({ loans, currency = 'RWF' }: { loans: Loan[]; currency?: string }) {
  return <DataTable rows={loans} rowKey="id" columns={[{ key: 'principal', label: 'Principal', render: (loan) => formatMoney(loan.principal, currency) }, { key: 'interest_rate', label: 'Rate', render: (loan) => `${loan.interest_rate}%` }, { key: 'term_months', label: 'Term', render: (loan) => `${loan.term_months} months` }, { key: 'purpose', label: 'Purpose' }, { key: 'status', label: 'Status' }, { key: 'due_date', label: 'Due date', render: (loan) => loan.due_date ? formatDate(loan.due_date) : '—' }]} />
}
