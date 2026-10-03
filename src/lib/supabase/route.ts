import { createClient } from './server'
import type { ZodType } from 'zod'

export async function requireApiUser(options: { requireMfaIfEnabled?: boolean } = {}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, user: null, response: Response.json({ error: { message: 'Authentication required.' } }, { status: 401 }) }
  if (options.requireMfaIfEnabled) {
    const [{ data: factors, error: factorsError }, { data: assurance, error: assuranceError }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    if (factorsError || assuranceError) return { supabase, user: null, response: Response.json({ error: { message: 'Could not verify this session’s security level.' } }, { status: 401 }) }
    const hasVerifiedFactor = factors.totp.some((factor) => factor.status === 'verified')
    if (hasVerifiedFactor && assurance.currentLevel !== 'aal2') return { supabase, user: null, response: Response.json({ error: { message: 'Verify your authenticator code before performing this action.' } }, { status: 403 }) }
  }
  return { supabase, user, response: null }
}

export async function readJson<T>(request: Request, schema: ZodType<T>) {
  let body: unknown
  try { body = await request.json() } catch { return { data: null, response: Response.json({ error: { message: 'Request body must be valid JSON.' } }, { status: 400 }) } }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return { data: null, response: Response.json({ error: { message: parsed.error.issues[0]?.message ?? 'Request data is invalid.' } }, { status: 400 }) }
  return { data: parsed.data, response: null }
}

export function databaseError(error: { code?: string; message: string }) {
  const status = error.code === '23505' || error.code === '23503' ? 409 : error.code === '42501' ? 403 : error.code === 'PGRST116' ? 404 : error.code === '23514' || error.code === '22P02' || error.code === 'P0001' ? 422 : 500
  const message = status === 403 ? 'You do not have permission to perform this action.' : status === 404 ? 'The requested record was not found.' : status === 409 ? 'The record conflicts with existing group data.' : status === 422 ? 'The submitted values do not meet the group rules.' : 'The data service could not complete the request.'
  return Response.json({ error: { message } }, { status })
}
