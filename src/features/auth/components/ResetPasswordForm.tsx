'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'

export function ResetPasswordForm() {
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true)
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    try {
      const { error: authError } = await createClient().auth.updateUser({ password })
      if (authError) throw authError
      setSaved(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update the password.') }
    finally { setPending(false) }
  }
  if (saved) return <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">Password updated. You can now sign in with it.</p>
  return <form onSubmit={submit} className="grid gap-4"><FormError message={error} /><FormField htmlFor="password" label="New password"><Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></FormField><FormSubmit pending={pending}>Update password</FormSubmit></form>
}
