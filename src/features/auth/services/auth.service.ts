import { apiRequest } from '@/lib/api'
import type { LoginInput, RegisterInput } from '@/types/auth'

export const authService = {
  login: (values: LoginInput) => apiRequest<{ message: string; requiresMfa: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify(values) }),
  register: (values: RegisterInput) => apiRequest<{ message: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(values) }),
  logout: () => apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' }),
}
