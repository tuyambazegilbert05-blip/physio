import { apiRequest } from '@/lib/api'
import type { LoginInput, RegisterInput } from '@/types/auth'
import type { ClaimAccountValues } from '@/features/auth/schemas/auth.schema'

export const authService = {
  login: (values: LoginInput) =>
    apiRequest<{
      message: string
      requiresMfa: boolean
      requiresEmailVerification?: boolean
      email?: string
      mustChangePassword?: boolean
      isMigrated?: boolean
      temporaryMigrationEmail?: boolean
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
  requestClaimOtp: (newEmail: string) =>
    apiRequest<{ message: string; emailSent: boolean }>(
      '/api/auth/claim-migrated-account/request-otp',
      {
        method: 'POST',
        body: JSON.stringify({ newEmail }),
      },
    ),
  claimAccount: (values: ClaimAccountValues) =>
    apiRequest<{ message: string; success: boolean }>('/api/auth/claim-migrated-account', {
      method: 'POST',
      body: JSON.stringify(values),
    }),
  getMigrationProfile: () =>
    apiRequest<{
      fullName: string
      temporaryEmail: string
      phone: string | null
      legacyId: string | null
      groupName: string | null
      groupId: string | null
    }>('/api/auth/claim-migrated-account'),
  logout: () => apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' }),
}
