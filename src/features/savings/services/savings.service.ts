import { apiRequest } from '@/lib/api'
import type { SavingsSummary } from '@/types/savings'
export const savingsService = { summary: (groupId: string) => apiRequest<SavingsSummary>(`/api/savings?group_id=${encodeURIComponent(groupId)}`) }
