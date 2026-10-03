import { apiRequest } from '@/lib/api'
import type { Group } from '@/types/group'
export const groupService = { list: () => apiRequest<Group[]>('/api/groups'), create: (values: { name: string; currency: string; contribution_amount: number; contribution_frequency: Group['contribution_frequency'] }) => apiRequest<Group>('/api/groups', { method: 'POST', body: JSON.stringify(values) }) }
