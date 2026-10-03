import { apiRequest } from '@/lib/api'
import type { Loan } from '@/types/loan'
export const loanService = { list: (groupId: string) => apiRequest<Loan[]>(`/api/loans?group_id=${encodeURIComponent(groupId)}`), apply: (values: { group_id: string; member_id: string; principal: number; interest_rate: number; term_months: number; purpose: string; is_draft?: boolean }) => apiRequest<Loan>('/api/loans', { method: 'POST', body: JSON.stringify(values) }) }
