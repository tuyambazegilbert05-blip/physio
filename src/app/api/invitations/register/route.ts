import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { registerSchema } from '@/features/auth/schemas/auth.schema'
import { getPublicGroupInvitation } from '@/lib/security/group-invitations'
import { hashGroupInvitationToken, normalizeInvitationEmail } from '@/lib/security/group-invitation-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentApplicationUser, getRequestIp, applicationSessionCookieOptions, applicationSessionExpiry, createRawApplicationSessionToken, hashApplicationToken, consumeAuthRateLimit, assertApplicationDatabaseAuthConfigured } from '@/lib/security/application-session'
import { hashPassword } from '@/lib/security/password-hash'
import { readJson } from '@/lib/supabase/route'

const schema = registerSchema.extend({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })

export async function POST(request: Request) {
  const parsed = await readJson(request, schema)
  if (parsed.response) return parsed.response
  const { token, email, fullName, phone, password } = parsed.data
  if (await getCurrentApplicationUser()) {
    return Response.json({ error: { message: 'Sign out first to create a new invited account. Existing accounts can sign in and accept this invitation.' } }, { status: 409 })
  }

  let invitation
  try {
    invitation = await getPublicGroupInvitation(token)
  } catch (error) {
    console.warn('[Invitations] Invitation registration validation failed.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'Invitation status is temporarily unavailable.' } }, { status: 503 })
  }
  if (!invitation.email || !['pending', 'sent', 'delivery_failed'].includes(invitation.status) || !invitation.group_available) {
    return Response.json({ error: { message: invitation.status === 'expired' ? 'This invitation has expired. Ask the inviter to send a new one.' : 'This invitation is no longer available.' } }, { status: 409 })
  }
  if (normalizeInvitationEmail(email) !== normalizeInvitationEmail(invitation.email)) {
    return Response.json({ error: { message: 'Create the account with the invited email address.' } }, { status: 400 })
  }

  try {
    assertApplicationDatabaseAuthConfigured()
    const allowed = await consumeAuthRateLimit({ scope: 'invite-register:ip', value: getRequestIp(request), maxRequests: 15, windowSeconds: 60 * 60 })
    if (!allowed) return Response.json({ error: { message: 'Too many account attempts. Try again later.' } }, { status: 429, headers: { 'Retry-After': '3600' } })
    const admin = createAdminClient()
    const normalizedEmail = normalizeInvitationEmail(invitation.email)
    const { data: existing, error: lookupError } = await admin.from('profiles').select('id').eq('normalized_email', normalizedEmail).maybeSingle()
    if (lookupError) throw lookupError
    if (existing) return Response.json({ error: { message: 'An account may already exist for this invitation. Sign in with the invited email and accept it.' } }, { status: 409 })

    const userId = randomUUID()
    const rawToken = createRawApplicationSessionToken()
    const expiresAt = applicationSessionExpiry(true)
    const passwordHash = await hashPassword(password)
    const { data: result, error: createError } = await admin.rpc('create_invited_application_account', {
      target_user: userId,
      target_email: normalizedEmail,
      target_full_name: fullName,
      target_phone: phone,
      target_password_hash: passwordHash,
      target_session_hash: hashApplicationToken(rawToken),
      target_session_expiry: expiresAt,
      target_ip: getRequestIp(request),
      target_user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? '',
      target_invitation_hash: hashGroupInvitationToken(token),
    })
    if (createError) {
      console.warn('[Invitations] Invited account activation failed.', { code: createError.code ?? 'unknown' })
      return Response.json({ error: { message: createError.code === '23505' ? 'An account may already exist for this invitation. Sign in with the invited email and accept it.' : 'The account and membership could not be created. Verify the invitation and try again.' } }, { status: createError.code === '23505' ? 409 : 409 })
    }
    const accepted = result as { status?: string; group_id?: string; group_name?: string }
    const invitationAccepted = accepted.status === 'accepted'
    const response = !invitationAccepted
      ? NextResponse.json({ error: { message: 'The account and membership could not be created. Verify the invitation and try again.' } }, { status: 409 })
      : NextResponse.json({ data: accepted }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
    if (invitationAccepted) {
      response.cookies.set('ikimina_session', rawToken, applicationSessionCookieOptions(expiresAt))
    }
    return response
  } catch (error) {
    console.warn('[Invitations] Invited account creation is temporarily unavailable.', { reason: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: { message: 'The account could not be created. Please try again.' } }, { status: 503 })
  }
}
