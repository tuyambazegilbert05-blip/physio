import { z } from 'zod'
import { passwordSchema } from './password-policy.ts'
import { phoneSchema } from '../../../lib/validations/phone.ts'

export const loginSchema = z.object({ identifier: z.string().trim().min(3).max(254).refine((value) => value.includes('@') ? z.email().safeParse(value).success : /^\+?[1-9]\d{7,14}$/.test(value) || /^0\d{8,9}$/.test(value), 'Enter a valid email or phone number (use country code for numbers outside Rwanda).'), password: z.string().min(8).max(72), keepSignedIn: z.boolean().optional() })
export const registerSchema = z.object({ fullName: z.string().trim().min(2).max(120), email: z.email().trim().toLowerCase(), phone: phoneSchema, password: passwordSchema })
export const forgotPasswordSchema = z.object({ email: z.email() })
export const resetPasswordSchema = z.object({ password: passwordSchema })
export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
