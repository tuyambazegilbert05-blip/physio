import { z } from 'zod'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const claimSchema = z.object({ member_id: uuidSchema })

export async function POST(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const parsed = await readJson(request, claimSchema)
  if (parsed.response) return parsed.response

  const { data, error } = await auth.supabase.rpc('claim_member', { target_member: parsed.data.member_id })
  if (error) return databaseError(error)
  return Response.json({ data })
}
