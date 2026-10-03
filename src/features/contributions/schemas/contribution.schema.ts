import { z } from 'zod'
export const contributionCreateSchema = z.object({ group_id: z.string().uuid(), member_id: z.string().uuid(), amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), contribution_type: z.enum(['regular', 'social', 'special']), period: z.iso.date(), reference: z.string().max(120).nullable().optional() })
