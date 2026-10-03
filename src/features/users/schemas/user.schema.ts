import { z } from 'zod'
export const profileUpdateSchema = z.object({ full_name: z.string().trim().min(2).max(120), phone: z.string().max(40).nullable().optional(), avatar_url: z.url().nullable().optional() })
