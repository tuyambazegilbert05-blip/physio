import { z } from 'zod'
import { hashGroupInvitationToken } from '@/lib/security/group-invitation-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { readJson } from '@/lib/supabase/route'

const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })

export async function POST(request: Request) {
  const parsed = await readJson(request, schema)
  if (parsed.response) return parsed.response
  try {
    const admin = createAdminClient()
    const { data: status, error } = await admin.rpc('decline_group_invitation', {
      target_token_hash: hashGroupInvitationToken(parsed.data.token),
    })
    if (error) {
      console.warn('[Invitations] Decline action could not be recorded.', { code: error.code ?? 'unknown' })
      return Response.json({ error: { message: 'The invitation could not be updated. Please try again.' } }, { status: 503 })
    }
    return Response.json({ data: { status } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.warn('[Invitations] Decline action failed.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'The invitation could not be updated. Please try again.' } }, { status: 503 })
  }
}
