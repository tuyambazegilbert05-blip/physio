'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { registerSchema } from '@/features/auth/schemas/auth.schema'
import { authService } from '@/features/auth/services/auth.service'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const parsed = registerSchema.safeParse({ fullName: form.get('fullName'), email: form.get('email'), password: form.get('password') })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your details.'); return }
    setPending(true)
    try { await authService.register(parsed.data); router.push('/verify-email') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Registration failed.') }
    finally { setPending(false) }
  }
  return <form onSubmit={submit} className="grid gap-4"><FormError message={error} /><FormField htmlFor="fullName" label="Full name"><Input id="fullName" name="fullName" autoComplete="name" required /></FormField><FormField htmlFor="email" label="Email address"><Input id="email" name="email" type="email" autoComplete="email" required /></FormField><FormField htmlFor="password" label="Password" hint="Use at least 8 characters."><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></FormField><FormSubmit pending={pending}>Create account</FormSubmit><p className="text-center text-sm text-slate-600">Already registered? <Link href="/login" className="font-medium text-indigo-700">Sign in</Link></p></form>
}
