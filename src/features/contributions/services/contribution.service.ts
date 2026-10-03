import { apiRequest } from '@/lib/api'
import type { Contribution } from '@/types/contribution'
export const contributionService = { list: (groupId: string) => apiRequest<Contribution[]>(`/api/contributions?group_id=${encodeURIComponent(groupId)}`), create: (values: { group_id: string; member_id: string; amount: number; contribution_type: Contribution['contribution_type']; period: string; reference?: string | null }) => apiRequest<Contribution>('/api/contributions', { method: 'POST', body: JSON.stringify(values) }) }
