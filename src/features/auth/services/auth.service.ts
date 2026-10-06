import { apiRequest } from '@/lib/api'
import type { LoginInput, RegisterInput } from '@/types/auth'

export const authService = {
  login: (values: LoginInput) =>
    apiRequest<{
      message: string
      requiresMfa: boolean
      requiresEmailVerification?: boolean
      email?: string
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(values),
    }),
  register: (values: RegisterInput) =>
    apiRequest<{ message: string; emailSent: boolean }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(values),
    }),
  resendVerification: () =>
    apiRequest<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST',
    }),
  getEmailVerificationState: () =>
    apiRequest<{ email: string; verified: boolean }>('/api/auth/verify-email'),
  verifyEmail: (email: string, code: string) =>
    apiRequest<{ verified: boolean }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  logout: () => apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' }),
}
