import { z } from 'zod'

export const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number.')
  .max(25, 'Phone numbers must be 25 characters or fewer.')
  .regex(/^\+?[0-9][0-9\s()\-.]{5,23}$/, 'Enter a valid phone number.')
  .transform((value) => value.replace(/[\s().-]/g, ''))
