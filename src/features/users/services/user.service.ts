import { apiRequest } from '@/lib/api'
import type { UserProfile } from '@/types/user'
export const userService = { profile: () => apiRequest<UserProfile>('/api/users'), updateProfile: (values: Partial<UserProfile>) => apiRequest<UserProfile>('/api/users', { method: 'PATCH', body: JSON.stringify(values) }) }
