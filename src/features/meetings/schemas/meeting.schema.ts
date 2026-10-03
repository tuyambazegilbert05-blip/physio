import { z } from 'zod'
export const meetingCreateSchema = z.object({ group_id: z.string().uuid(), title: z.string().trim().min(3).max(160), agenda: z.string().max(5000).nullable().optional(), location: z.string().max(240).nullable().optional(), starts_at: z.iso.datetime(), ends_at: z.iso.datetime().nullable().optional() })
