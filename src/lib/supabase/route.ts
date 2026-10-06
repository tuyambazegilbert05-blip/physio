import { createApplicationDatabaseClient, getCurrentApplicationSession } from '@/lib/security/application-session'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ZodType } from 'zod'

export async function requireApiUser(
  options: { requireMfaIfEnabled?: boolean; requireVerifiedEmail?: boolean } = {},
) {
  const session = await getCurrentApplicationSession()
  if (!session)
    return {
      supabase: await createApplicationDatabaseClient(null),
      user: null,
      response: Response.json({ error: { message: 'Authentication required.' } }, { status: 401 }),
    }
  const user = session.user
  let supabase
  try {
    supabase = await createApplicationDatabaseClient(user)
  } catch {
    return {
      supabase: await createApplicationDatabaseClient(null),
      user: null,
      response: Response.json({ error: { message: 'Authenticated database access is temporarily unavailable.' } }, { status: 503 }),
    }
  }
  if (options.requireVerifiedEmail !== false) {
    const { data: emailVerified, error: verificationError } = await supabase.rpc(
      'current_account_email_verified',
    )
    if (verificationError) {
      return {
        supabase,
        user: null,
        response: Response.json(
          { error: { message: 'Could not verify account access status.' } },
          { status: 503 },
        ),
      }
    }
    if (!emailVerified) {
      return {
        supabase,
        user: null,
        response: Response.json(
          {
            error: { message: 'Verify your email with the code we sent before accessing Ikimina.' },
          },
          { status: 403 },
        ),
      }
    }
  }
  if (options.requireMfaIfEnabled) {
    const { data: factor, error: factorError } = await createAdminClient()
      .from('app_totp_factors')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
    if (factorError) {
      return {
        supabase,
        user: null,
        response: Response.json(
          { error: { message: 'Could not verify account security status.' } },
          { status: 503 },
        ),
      }
    }
    if (factor?.status === 'verified' && (!session.mfaVerifiedUntil || Date.parse(session.mfaVerifiedUntil) <= Date.now())) {
      return {
        supabase,
        user: null,
        response: Response.json(
          { error: { message: 'Verify your authenticator again by signing in.' } },
          { status: 403 },
        ),
      }
    }
  }
  return { supabase, user, response: null }
}

export async function readJson<T>(request: Request, schema: ZodType<T>) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return {
      data: null,
      response: Response.json(
        { error: { message: 'Request body must be valid JSON.' } },
        { status: 400 },
      ),
    }
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return {
      data: null,
      response: Response.json(
        { error: { message: parsed.error.issues[0]?.message ?? 'Request data is invalid.' } },
        { status: 400 },
      ),
    }
  return { data: parsed.data, response: null }
}

export function databaseError(error: { code?: string; message: string }) {
  const status =
    error.code === '23505' || error.code === '23503'
      ? 409
      : error.code === '42501'
        ? 403
        : error.code === 'PGRST116'
          ? 404
          : error.code === '23514' || error.code === '22P02' || error.code === 'P0001'
            ? 422
            : 500
  const message =
    status === 403
      ? 'You do not have permission to perform this action.'
      : status === 404
        ? 'The requested record was not found.'
        : status === 409
          ? 'The record conflicts with existing group data.'
          : status === 422
            ? 'The submitted values do not meet the group rules.'
            : 'The data service could not complete the request.'
  return Response.json({ error: { message } }, { status })
}
