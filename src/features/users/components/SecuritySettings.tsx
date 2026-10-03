'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'

type TOTPFactor = { id: string; friendly_name?: string; status: 'verified' | 'unverified'; created_at: string }
type TOTPSetup = { id: string; qrCode: string; secret: string }

export function SecuritySettings() {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [factors, setFactors] = useState<TOTPFactor[]>([])
  const [setup, setSetup] = useState<TOTPSetup | null>(null)
  const [code, setCode] = useState('')

  const refreshFactors = useCallback(async () => {
    const { data, error: factorsError } = await createClient().auth.mfa.listFactors()
    if (factorsError) throw factorsError
    setFactors(data.totp as TOTPFactor[])
  }, [])

  useEffect(() => { void refreshFactors().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load two-factor settings.')) }, [refreshFactors])

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const password = String(new FormData(formElement).get('password') ?? '')
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    setPending(true); setError(''); setMessage('')
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password })
      if (updateError) setError(updateError.message)
      else { formElement.reset(); setMessage('Password updated.') }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update your password.') }
    finally { setPending(false) }
  }

  async function beginMfaSetup() {
    setPending(true); setError(''); setMessage('')
    try {
      const { data, error: enrollError } = await createClient().auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Ikimina authenticator' })
      if (enrollError) throw enrollError
      setSetup({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not begin authenticator setup.') }
    finally { setPending(false) }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!setup) return
    setPending(true); setError(''); setMessage('')
    try {
      const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId: setup.id, code: code.trim() })
      if (verifyError) throw verifyError
      setSetup(null); setCode(''); await refreshFactors(); setMessage('Two-factor authentication is enabled for this account.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'That authenticator code could not be verified.') }
    finally { setPending(false) }
  }

  async function removeFactor(factorId: string) {
    if (!window.confirm('Remove this authenticator from your account?')) return
    setPending(true); setError(''); setMessage('')
    try {
      const { error: removeError } = await createClient().auth.mfa.unenroll({ factorId })
      if (removeError) throw removeError
      await refreshFactors(); setMessage('Authenticator removed.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove this authenticator.') }
    finally { setPending(false) }
  }

  async function signOutOtherSessions() {
    setPending(true); setError(''); setMessage('')
    try {
      const { error: signOutError } = await createClient().auth.signOut({ scope: 'others' })
      if (signOutError) throw signOutError
      setMessage('Other sessions have been signed out.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not end other sessions.') }
    finally { setPending(false) }
  }

  return <div className="max-w-xl space-y-8">
    <FormError message={error} />
    {message && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <section><h2 className="mb-4 text-lg font-semibold">Change password</h2><form onSubmit={updatePassword} className="grid gap-4"><FormField htmlFor="new-password" label="New password"><Input id="new-password" name="password" type="password" minLength={8} autoComplete="new-password" required /></FormField><FormSubmit pending={pending}>Update password</FormSubmit></form></section>
    <section className="space-y-4"><div><h2 className="text-lg font-semibold">Two-factor authentication</h2><p className="mt-1 text-sm text-slate-600">Use an authenticator app to protect sign-ins and sensitive financial actions.</p></div>
      {factors.filter((factor) => factor.status === 'verified').map((factor) => <div key={factor.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><div><strong className="text-sm">Authenticator app</strong><p className="text-xs text-slate-500">{factor.friendly_name ?? 'Verified authenticator'}</p></div><button type="button" disabled={pending} onClick={() => void removeFactor(factor.id)} className="rounded-md border border-slate-300 px-3 py-2 text-xs">Remove</button></div>)}
      {setup ? <form onSubmit={verifyMfa} className="grid gap-3 rounded-lg border border-slate-200 p-4"><p className="text-sm">Scan this QR code with an authenticator app, or enter the setup key manually.</p><img src={setup.qrCode} alt="Authenticator setup QR code" className="h-44 w-44 rounded bg-white p-2" /><code className="break-all rounded bg-slate-100 p-2 text-xs">{setup.secret}</code><FormField htmlFor="mfa-code" label="6-digit verification code"><Input id="mfa-code" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></FormField><div className="flex gap-2"><FormSubmit pending={pending}>Verify and enable</FormSubmit><button type="button" disabled={pending} onClick={() => setSetup(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button></div></form> : factors.some((factor) => factor.status === 'unverified') ? <p className="text-sm text-amber-800">An authenticator setup is pending. Finish setup or remove the unverified factor before starting again.</p> : <button type="button" disabled={pending} onClick={() => void beginMfaSetup()} className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Set up authenticator</button>}
    </section>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold">Session security</h2><p className="text-sm text-slate-600">Sessions use secure, HTTP-only cookies managed by Supabase Auth.</p></div><button type="button" disabled={pending} onClick={() => void signOutOtherSessions()} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Sign out other sessions</button></section>
  </div>
}
