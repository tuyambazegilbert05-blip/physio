'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'

export function ForgotPasswordForm() {
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true)
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    try {
      const { error: authError } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` })
      if (authError) throw authError
      setSent(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to send a reset link.') }
    finally { setPending(false) }
  }
  if (sent) return <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">If that address belongs to an account, a password reset link has been sent.</p>
  return <form onSubmit={submit} className="grid gap-4"><FormError message={error} /><FormField htmlFor="email" label="Email address"><Input id="email" name="email" type="email" autoComplete="email" required /></FormField><FormSubmit pending={pending}>Send reset link</FormSubmit></form>
}
