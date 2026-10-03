import { z } from 'zod'
export const groupIdSchema = z.object({ group_id: z.string().uuid() })
