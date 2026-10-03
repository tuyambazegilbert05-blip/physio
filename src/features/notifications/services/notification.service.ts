import { apiRequest } from '@/lib/api'
import type { NotificationRecord } from '@/types/notification'
export const notificationService = { list: () => apiRequest<NotificationRecord[]>('/api/users?resource=notifications'), markRead: (id: string) => apiRequest<NotificationRecord>(`/api/users?resource=notifications&id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ read: true }) }) }
