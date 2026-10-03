import { z } from 'zod'
export const memberCreateSchema = z.object({ group_id: z.string().uuid(), full_name: z.string().trim().min(2).max(120), email: z.email().nullable().optional(), phone: z.string().max(40).nullable().optional(), status: z.enum(['active', 'inactive', 'suspended']).default('active') })
