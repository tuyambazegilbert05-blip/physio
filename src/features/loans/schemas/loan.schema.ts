import { z } from 'zod'
export const loanCreateSchema = z.object({ group_id: z.string().uuid(), member_id: z.string().uuid(), principal: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), interest_rate: z.number().min(0).max(100).default(0), term_months: z.number().int().min(1).max(120), purpose: z.string().trim().min(5).max(1000), is_draft: z.boolean().default(false) })
