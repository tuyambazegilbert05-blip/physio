'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '@/lib/api'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { PasswordPolicyFields } from '@/features/auth/components/PasswordPolicyFields'

type TotpState = { enabled: boolean; pending: boolean; createdAt: string | null }
type TotpSetup = { secret: string; otpauthUrl: string }

export function SecuritySettings() {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [factor, setFactor] = useState<TotpState>({ enabled: false, pending: false, createdAt: null })
  const [setup, setSetup] = useState<TotpSetup | null>(null)
  const [code, setCode] = useState('')

  async function refreshFactor() {
    const result = await apiRequest<TotpState>('/api/auth/mfa')
    setFactor(result)
  }

  useEffect(() => {
    let active = true
    void apiRequest<TotpState>('/api/auth/mfa')
      .then((result) => { if (active) setFactor(result) })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load security settings.')
      })
    return () => { active = false }
  }, [])

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setError(''); setMessage('')
    if (password !== confirmation) { setError('Passwords do not match.'); return }
    setPending(true)
    const form = new FormData(formElement)
    try {
      const result = await apiRequest<{ message: string }>('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: form.get('currentPassword'), newPassword: password }),
      })
      setMessage(result.message)
      setPassword(''); setConfirmation('')
      formElement.reset()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update your password.') }
    finally { setPending(false) }
  }

  async function beginMfa() {
    setPending(true); setError(''); setMessage('')
    try {
      const result = await apiRequest<TotpSetup>('/api/auth/mfa', { method: 'POST' })
      setSetup(result)
      setCode('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not begin authenticator setup.') }
    finally { setPending(false) }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(''); setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await apiRequest('/api/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ code, currentPassword: form.get('mfaCurrentPassword') }) })
      setSetup(null); setCode('')
      formElement.reset()
      await refreshFactor()
      setMessage('Two-factor authentication is enabled for this account.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'That authenticator code could not be verified.') }
    finally { setPending(false) }
  }

  async function removeMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(''); setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await apiRequest('/api/auth/mfa', {
        method: 'DELETE',
        body: JSON.stringify({ currentPassword: form.get('currentPassword'), code: form.get('code') }),
      })
      formElement.reset()
      await refreshFactor()
      setMessage('Authenticator removed.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove this authenticator.') }
    finally { setPending(false) }
  }

  async function signOutOtherSessions() {
    setPending(true); setError(''); setMessage('')
    try {
      const result = await apiRequest<{ message: string }>('/api/auth/sessions', { method: 'DELETE' })
      setMessage(result.message)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not end other sessions.') }
    finally { setPending(false) }
  }

  return (
    <div className="space-y-6">
      <FormError message={error} />
      {message && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm font-medium text-emerald-800">{message}</p>}
      <section className="rounded-2xl border border-indigo-50 bg-gradient-to-br from-white to-indigo-50/35 p-4 sm:p-5">
        <h2 className="mb-4 font-heading text-base font-extrabold text-[#081233]">Change password</h2>
        <form onSubmit={updatePassword} className="grid max-w-xl gap-4">
          <FormField htmlFor="current-password" label="Current password"><Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required /></FormField>
          <PasswordPolicyFields prefix="security" password={password} confirmation={confirmation} onPasswordChange={setPassword} onConfirmationChange={setConfirmation} />
          <FormSubmit pending={pending}>Update password</FormSubmit>
        </form>
      </section>
      <section className="space-y-4 rounded-2xl border border-indigo-50 bg-gradient-to-br from-white to-indigo-50/35 p-4 sm:p-5">
        <div>
          <h2 className="font-heading text-base font-extrabold text-[#081233]">Two-factor authentication</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">Protect sign-ins and sensitive account actions with a time-based authenticator code.</p>
        </div>
        {factor.enabled ? (
          <form onSubmit={removeMfa} className="grid max-w-xl gap-3 rounded-2xl border border-indigo-100 bg-white/90 p-4">
            <p className="text-sm font-semibold text-emerald-800">Authenticator app is enabled.</p>
            <FormField htmlFor="mfa-current-password" label="Current password"><Input id="mfa-current-password" name="currentPassword" type="password" autoComplete="current-password" required /></FormField>
            <FormField htmlFor="mfa-remove-code" label="Current authenticator code"><Input id="mfa-remove-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></FormField>
            <FormSubmit pending={pending}>Remove authenticator</FormSubmit>
          </form>
        ) : setup ? (
          <form onSubmit={verifyMfa} className="grid gap-3 rounded-2xl border border-indigo-100 bg-white/90 p-4">
            <p className="text-sm leading-relaxed text-slate-600">Add this account to your authenticator app using the setup key below, then enter the six-digit code it displays.</p>
            <code className="select-all break-all rounded-lg bg-slate-50 p-3 text-sm font-bold tracking-wider text-[#231044]">{setup.secret}</code>
            <a href={setup.otpauthUrl} className="break-all text-xs font-semibold text-violet-700 underline">Open authenticator setup link</a>
            <FormField htmlFor="mfa-enroll-current-password" label="Current password"><Input id="mfa-enroll-current-password" name="mfaCurrentPassword" type="password" autoComplete="current-password" required /></FormField>
            <FormField htmlFor="mfa-setup-code" label="Authenticator code"><Input id="mfa-setup-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></FormField>
            <FormSubmit pending={pending}>Verify and enable</FormSubmit>
            <button type="button" className="text-sm text-slate-600 underline" onClick={() => setSetup(null)}>Cancel setup</button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/90 p-4">
            <p className="text-sm text-slate-600">No authenticator is linked to this account.</p>
            <button type="button" disabled={pending} onClick={() => void beginMfa()} className="rounded-xl bg-[#7B3FF2] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Set up authenticator</button>
          </div>
        )}
      </section>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-50 bg-white p-4 sm:p-5">
        <div><h2 className="font-heading text-base font-extrabold text-[#081233]">Active sessions</h2><p className="mt-1 text-sm text-slate-500">End every other signed-in session on your account.</p></div>
        <button type="button" disabled={pending} onClick={() => void signOutOtherSessions()} className="rounded-xl border border-indigo-100 px-4 py-2.5 text-sm font-bold text-[#4d42cf] hover:bg-indigo-50 disabled:opacity-50">Sign out other sessions</button>
      </section>
    </div>
  )
}
