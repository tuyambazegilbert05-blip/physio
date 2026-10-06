import { z } from 'zod'
export const groupCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contribution_amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  contribution_frequency: z.enum(['weekly', 'monthly', 'quarterly']),
  currency: z.string().length(3).default('RWF'),
  description: z.string().trim().max(2000).default(''),
  location: z.string().trim().max(160).optional(),
  discoverable: z.boolean().default(true),
})

export const groupUpdateSchema = z.object({
  group_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  contribution_amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  contribution_frequency: z.enum(['weekly', 'monthly', 'quarterly']),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
})
