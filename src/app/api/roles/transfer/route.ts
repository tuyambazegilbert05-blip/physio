import { z } from 'zod'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

const transferSchema = z.object({
  group_id: z.string().uuid(),
  email: z.email().trim().max(254),
})

export async function POST(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const parsed = await readJson(request, transferSchema)
  if (parsed.response) return parsed.response
  const { data, error } = await auth.supabase.rpc('transfer_group_chairperson', {
    target_group: parsed.data.group_id,
    target_email: parsed.data.email,
  })
  if (error) return databaseError(error)
  return Response.json({ data })
}
