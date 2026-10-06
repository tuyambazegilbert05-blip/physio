import { z } from 'zod'
import { hashGroupInvitationToken } from '@/lib/security/group-invitation-token'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'

const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })

const messages: Record<string, { message: string; status: number }> = {
  invalid: { message: 'This invitation is invalid or no longer available.', status: 404 },
  accepted: { message: 'This invitation has already been accepted.', status: 409 },
  declined: { message: 'This invitation has already been declined.', status: 409 },
  expired: { message: 'This invitation has expired. Ask the inviter to send a new one.', status: 410 },
  revoked: { message: 'This invitation is no longer valid.', status: 410 },
  unavailable: { message: 'This group is currently not accepting invitations.', status: 409 },
  email_mismatch: { message: 'Sign in with the email address this invitation was sent to.', status: 403 },
  account_unverified: { message: 'The account email must be confirmed before this invitation can be accepted.', status: 403 },
  membership_blocked: { message: 'This account cannot be added to the group. Contact an authorized group official.', status: 409 },
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: false, requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const parsed = await readJson(request, schema)
  if (parsed.response) return parsed.response

  const { data, error } = await auth.supabase.rpc('accept_group_invitation', {
    target_token_hash: hashGroupInvitationToken(parsed.data.token),
  })
  if (error) return databaseError(error)
  const result = data as { status?: string; group_id?: string; group_name?: string; member_id?: string }
  if (result.status !== 'accepted') {
    const failure = messages[result.status ?? 'invalid'] ?? messages.invalid
    return Response.json({ error: { message: failure.message }, data: { status: result.status ?? 'invalid' } }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } })
  }
  return Response.json({ data: result }, { headers: { 'Cache-Control': 'no-store' } })
}
