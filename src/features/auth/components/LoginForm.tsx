'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { loginSchema } from '@/features/auth/schemas/auth.schema'
import { authService } from '@/features/auth/services/auth.service'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { apiRequest } from '@/lib/api'

export function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const [error, setError] = useState(() => search.get('message') ?? '')
  const [pending, setPending] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')

  function continueToApp() {
    const next = search.get('next')
    router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
    router.refresh()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const parsed = loginSchema.safeParse({ identifier: form.get('identifier'), password: form.get('password') })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your details.'); return }
    setPending(true)
    try {
      const response = await authService.login(parsed.data)
      if (response.requiresMfa) setMfaRequired(true)
      else continueToApp()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign in failed.') }
    finally { setPending(false) }
  }

  async function verifyMfa() {
    setPending(true); setError('')
    try {
      const client = createClient()
      const { data: factors, error: factorsError } = await client.auth.mfa.listFactors()
      if (factorsError) throw factorsError
      const factor = factors.totp.find((item) => item.status === 'verified')
      if (!factor) throw new Error('No verified authenticator is attached to this account.')
      const { error: verifyError } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: mfaCode.trim() })
      if (verifyError) throw verifyError
      await apiRequest('/api/auth/security-event', { method: 'POST' })
      continueToApp()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'That authenticator code could not be verified.') }
    finally { setPending(false) }
  }

  return <div className="grid gap-4">
    <FormError message={error} />
    <form onSubmit={submit} className="grid gap-4">
      <FormField htmlFor="identifier" label="Email or phone number"><Input id="identifier" name="identifier" type="text" autoComplete="username" placeholder="name@example.com or +250…" required disabled={mfaRequired} /></FormField>
      <FormField htmlFor="password" label="Password"><Input id="password" name="password" type="password" autoComplete="current-password" required disabled={mfaRequired} /></FormField>
      {!mfaRequired && <><div className="text-right"><Link href="/forgot-password" className="text-sm text-indigo-700 hover:underline">Forgot password?</Link></div><FormSubmit pending={pending}>Sign in</FormSubmit></>}
    </form>
    {mfaRequired && <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><h2 className="font-semibold">Two-factor verification</h2><p className="text-sm text-slate-600">Enter the current six-digit code from your authenticator app.</p><FormField htmlFor="sign-in-mfa-code" label="Authenticator code"><Input id="sign-in-mfa-code" value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></FormField><FormSubmit type="button" pending={pending} onClick={() => void verifyMfa()}>Verify and sign in</FormSubmit></section>}
    {!mfaRequired && <p className="text-center text-sm text-slate-600">New to Phyaio Cycle? <Link href="/register" className="font-medium text-indigo-700">Create an account</Link></p>}
  </div>
}
