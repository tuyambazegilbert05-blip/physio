import { z } from 'zod'

export type PasswordStrength = {
  score: number
  level: 'too-weak' | 'weak' | 'fair' | 'strong' | 'very-strong'
  label: string
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, level: 'too-weak', label: 'Too weak' }

  let score = password.length >= 8 ? 1 : 0
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  if (/(.)\1{3,}/.test(password) || /(?:0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|qwer|asdf|zxcv)/i.test(password)) {
    score = Math.max(0, score - 1)
  }

  if (score < 1) return { score, level: 'too-weak', label: 'Too weak' }
  if (score < 2) return { score, level: 'weak', label: 'Weak' }
  if (score < 4) return { score, level: 'fair', label: 'Fair' }
  if (score < 6) return { score, level: 'strong', label: 'Strong' }
  return { score, level: 'very-strong', label: 'Very strong' }
}

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use no more than 72 characters.')
  .refine((password) => evaluatePasswordStrength(password).score >= 2, {
    message: 'Choose a stronger password with a mix of letters, numbers, or symbols.',
  })
