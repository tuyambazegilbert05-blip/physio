import { loginSchema } from '@/features/auth/schemas/auth.schema'
import { readJson } from '@/lib/supabase/route'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const parsed = await readJson(request, loginSchema)
  if (parsed.response) return parsed.response
  const supabase = await createClient()
  const { identifier, password } = parsed.data
  const isEmail = identifier.includes('@')
  const normalizedPhone = identifier.startsWith('+') ? `+${identifier.replace(/\D/g, '')}` : identifier.startsWith('0') ? `+250${identifier.slice(1).replace(/\D/g, '')}` : `+${identifier.replace(/\D/g, '')}`
  const { error: signInError } = await supabase.auth.signInWithPassword(isEmail ? { email: identifier.toLowerCase(), password } : { phone: normalizedPhone, password })
  if (signInError) return Response.json({ error: { message: 'Email, phone, or password is incorrect.' } }, { status: 401 })
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) {
    await supabase.auth.signOut()
    return Response.json({ error: { message: 'Could not verify two-factor settings. Try again.' } }, { status: 503 })
  }
  const requiresMfa = factors.totp.some((factor) => factor.status === 'verified')
  if (!requiresMfa) await supabase.rpc('notify_security_sign_in')
  return Response.json({ data: { message: 'Signed in.', requiresMfa } })
}
