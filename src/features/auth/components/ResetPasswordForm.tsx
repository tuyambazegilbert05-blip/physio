'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '@/lib/api'
import { FormError } from '@/components/forms/FormError'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { PasswordPolicyFields } from './PasswordPolicyFields'
import { resetPasswordSchema } from '@/features/auth/schemas/auth.schema'

export function ResetPasswordForm() {
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true)
    const parsed = resetPasswordSchema.safeParse({ password })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Choose a stronger password.'); setPending(false); return }
    if (password !== confirmation) { setError('Passwords do not match.'); setPending(false); return }
    try {
      const token = new URLSearchParams(window.location.search).get('token') ?? ''
      await apiRequest('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password: parsed.data.password }) })
      setSaved(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update the password.') }
    finally { setPending(false) }
  }
  if (saved) return <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">Password updated. You can now sign in with it.</p>
  return <form onSubmit={submit} className="grid gap-4"><FormError message={error} /><PasswordPolicyFields prefix="reset" password={password} confirmation={confirmation} onPasswordChange={setPassword} onConfirmationChange={setConfirmation} /><FormSubmit pending={pending}>Update password</FormSubmit></form>
}
