import { createHash, createHmac, randomBytes } from 'node:crypto'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Json } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupabaseEnvironment } from '@/config/environment'

export const applicationSessionCookie = 'ikimina_session'
const sessionLifetimeSeconds = 60 * 60 * 24 * 30
const sessionIdleLifetimeSeconds = 60 * 60 * 24 * 7
const databaseJwtLifetimeSeconds = 5 * 60

export type ApplicationUser = {
  id: string
  email: string
  user_metadata: { full_name: string }
  app_metadata: Record<string, never>
  email_confirmed_at: string | null
}

export type ApplicationSession = {
  id: string
  tokenHash: string
  expiresAt: string
  mfaVerifiedUntil: string | null
  user: ApplicationUser
}

export function hashApplicationToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('AUTH_SESSION_SECRET must contain at least 32 characters.')
  return secret
}

export function hashRateLimitBucket(scope: string, value: string) {
  return createHmac('sha256', getSessionSecret()).update(`ikimina-auth-rate:${scope}:${value}`).digest('hex')
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return request.headers.get('x-real-ip')?.trim() || forwarded || 'unknown'
}

export async function consumeAuthRateLimit({
  scope,
  value,
  maxRequests,
  windowSeconds,
}: {
  scope: string
  value: string
  maxRequests: number
  windowSeconds: number
}) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('consume_app_auth_rate_limit', {
    target_scope: scope,
    target_bucket_hash: hashRateLimitBucket(scope, value),
    max_requests: maxRequests,
    window_seconds: windowSeconds,
  })
  if (error) throw new Error('Authentication rate limiting is unavailable.')
  return Boolean(data)
}

export function createRawApplicationSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function applicationSessionExpiry(rememberMe = true) {
  const seconds = rememberMe ? sessionLifetimeSeconds : 60 * 60 * 12
  return new Date(Date.now() + seconds * 1000).toISOString()
}

export function applicationSessionCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: new Date(expiresAt),
  }
}

export async function clearApplicationSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(applicationSessionCookie, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function createApplicationSession(userId: string, request: Request, rememberMe = true) {
  const rawToken = createRawApplicationSessionToken()
  const expiresAt = applicationSessionExpiry(rememberMe)
  const admin = createAdminClient()
  const { error } = await admin.from('app_sessions').insert({
    user_id: userId,
    token_hash: hashApplicationToken(rawToken),
    expires_at: expiresAt,
    ip_address: getRequestIp(request),
    user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
  })
  if (error) throw new Error('Could not create an application session.')
  return { rawToken, expiresAt }
}

export async function getCurrentApplicationSession(): Promise<ApplicationSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(applicationSessionCookie)?.value
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const tokenHash = hashApplicationToken(token)
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const idleCutoff = new Date(Date.now() - sessionIdleLifetimeSeconds * 1000).toISOString()
  const { data: session, error } = await admin
    .from('app_sessions')
    .select('id,user_id,token_hash,expires_at,last_seen_at,mfa_verified_until')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gt('expires_at', now)
    .gt('last_seen_at', idleCutoff)
    .maybeSingle()
  if (error) throw new Error('Application session validation is unavailable.')
  if (!session) return null
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id,email,full_name,email_verified_at,account_status')
    .eq('id', session.user_id)
    .maybeSingle()
  if (profileError) throw new Error('Application account validation is unavailable.')
  if (!profile || !profile.email || !['active', 'pending_verification'].includes(profile.account_status)) return null

  if (Date.now() - new Date(session.last_seen_at).getTime() > 5 * 60 * 1000) {
    void admin.from('app_sessions').update({ last_seen_at: now }).eq('id', session.id).then(() => undefined)
  }
  return {
    id: session.id,
    tokenHash,
    expiresAt: session.expires_at,
    mfaVerifiedUntil: session.mfa_verified_until,
    user: {
      id: profile.id,
      email: profile.email,
      user_metadata: { full_name: profile.full_name },
      app_metadata: {},
      email_confirmed_at: profile.email_verified_at,
    },
  }
}

export async function getCurrentApplicationUser() {
  return (await getCurrentApplicationSession())?.user ?? null
}

export async function createApplicationDatabaseClient(user: Pick<ApplicationUser, 'id'> | null) {
  const { url, publishableKey } = getSupabaseEnvironment()
  const headers: Record<string, string> = {}
  if (user) {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    if (!jwtSecret || jwtSecret.length < 32) throw new Error('SUPABASE_JWT_SECRET must be configured for authenticated database access.')
    const now = Math.floor(Date.now() / 1000)
    const accessToken = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setAudience('authenticated')
      .setIssuedAt(now)
      .setExpirationTime(now + databaseJwtLifetimeSeconds)
      .sign(new TextEncoder().encode(jwtSecret))
    headers.Authorization = `Bearer ${accessToken}`
  }
  return createSupabaseClient<Database>(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers },
  })
}

export function assertApplicationDatabaseAuthConfigured() {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  if (!jwtSecret || jwtSecret.length < 32) throw new Error('SUPABASE_JWT_SECRET must be configured for authenticated database access.')
}

export async function logApplicationAuthEvent(action: string, userId?: string | null, details: Record<string, unknown> = {}) {
  try {
    const admin = createAdminClient()
    const safeDetails = JSON.parse(JSON.stringify(details)) as Json
    const rows: Database['public']['Tables']['audit_logs']['Insert'][] = [{
      group_id: null,
      actor_id: userId ?? null,
      action,
      entity: 'account',
      entity_id: userId ?? null,
      details: safeDetails,
      permission_used: null,
      authority_roles: [],
      before_data: null,
      after_data: null,
    }]

    if (userId) {
      const [memberships, assignments] = await Promise.all([
        admin.from('members').select('group_id').eq('user_id', userId).eq('status', 'active'),
        admin.from('group_role_assignments').select('group_id').eq('user_id', userId),
      ])
      if (memberships.error) throw memberships.error
      if (assignments.error) throw assignments.error
      const groupIds = new Set([
        ...(memberships.data ?? []).map(({ group_id }) => group_id),
        ...(assignments.data ?? []).map(({ group_id }) => group_id),
      ])
      for (const groupId of groupIds) {
        rows.push({
          group_id: groupId,
          actor_id: userId,
          action,
          entity: 'account_security_events',
          entity_id: userId,
          details: safeDetails,
          permission_used: null,
          authority_roles: [],
          before_data: null,
          after_data: null,
        })
      }
    }

    const { error } = await admin.from('audit_logs').insert(rows)
    if (error) throw error
  } catch {
    // Authentication remains available if the optional audit write fails.
    console.warn('[Auth] Could not write an authentication audit event.', { action })
  }
}
