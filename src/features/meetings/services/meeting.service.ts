import { apiRequest } from '@/lib/api'
import type { Meeting } from '@/types/meeting'
export const meetingService = { list: (groupId: string) => apiRequest<Meeting[]>(`/api/meetings?group_id=${encodeURIComponent(groupId)}`), create: (values: Omit<Meeting, 'id' | 'created_by' | 'created_at'>) => apiRequest<Meeting>('/api/meetings', { method: 'POST', body: JSON.stringify(values) }) }
