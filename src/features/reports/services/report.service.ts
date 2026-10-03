import { apiRequest } from '@/lib/api'
import type { FinancialReportRow, MemberReportRow } from '@/types/report'
export const reportService = { financial: (groupId: string) => apiRequest<FinancialReportRow[]>(`/api/reports?group_id=${encodeURIComponent(groupId)}&type=financial`), members: (groupId: string) => apiRequest<MemberReportRow[]>(`/api/reports?group_id=${encodeURIComponent(groupId)}&type=members`) }
