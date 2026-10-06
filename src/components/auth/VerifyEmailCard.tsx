'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import {
  MailCheck,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/Input'
import { authService } from '@/features/auth/services/auth.service'

type VerifyEmailCardProps = { lang?: 'en' | 'rw' }

export function VerifyEmailCard({ lang = 'en' }: VerifyEmailCardProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState(() => searchParams.get('email')?.trim() ?? '')
  const [authenticatedEmail, setAuthenticatedEmail] = useState('')
  const [deliveryNeedsRetry, setDeliveryNeedsRetry] = useState(
    () => searchParams.get('delivery') === 'retry',
  )
  const targetEmail = email.trim().toLowerCase()
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void authService
      .getEmailVerificationState()
      .then((state) => {
        setAuthenticatedEmail(state.email.trim().toLowerCase())
        setEmail((current) => current || state.email)
        if (state.verified) router.replace('/dashboard')
      })
      .catch(() => undefined)
  }, [router])

  const copy = {
    en: {
      badge: 'Account verification',
      title: 'Verify your email',
      subtitle:
        'Enter the six-digit code from your email. If it has not arrived, request a new one below. Membership still requires approval.',
      code: 'Email verification code',
      email: 'Email address',
      submit: pending ? 'Verifying…' : 'Verify and continue',
      resend: resending ? 'Sending…' : 'Send a new code',
      resent: 'If the account is awaiting verification, a new code has been sent.',
      deliveryRetry:
        'Your account was created, but the code could not be delivered. Request a new code below.',
      signIn: 'Already verified? Sign in',
      notice: 'The code expires after a short time and can only be used once.',
    },
    rw: {
      badge: 'Kwemeza konti',
      title: 'Emeza imeyili yawe',
      subtitle:
        'Andika kode y’imibare itandatu yohererejwe kuri imeyili yawe. Niba itaragera, saba indi hepfo. Kwinjira mu kimina bisaba kwemererwa.',
      code: 'Kode yo kwemeza imeyili',
      email: 'Aderesi ya imeyili',
      submit: pending ? 'Birimo kwemezwa…' : 'Emeza ukomeze',
      resend: resending ? 'Birimo koherezwa…' : 'Ohereza indi kode',
      resent: 'Niba konti itaremezwa, kode nshya yoherejwe.',
      deliveryRetry:
        'Konti yawe yarafunguwe ariko kode ntiyoherejwe. Ongera usabe indi kode hano hepfo.',
      signIn: 'Wamaze kwemezwa? Injira',
      notice: 'Kode irangira nyuma y’igihe gito kandi ikoreshwa rimwe gusa.',
    },
  }[lang]

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!targetEmail) {
      setError('Enter the email address you used to register.')
      return
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your email.')
      return
    }
    setPending(true)
    try {
      await authService.verifyEmail(targetEmail, code)
      router.replace('/dashboard')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That code could not be verified.')
    } finally {
      setPending(false)
    }
  }

  async function resend() {
    if (!targetEmail) return
    setResending(true)
    setError('')
    setResent(false)
    try {
      if (!authenticatedEmail || authenticatedEmail !== targetEmail) {
        throw new Error(
          'Sign in to the account for this email address before requesting a new code.',
        )
      }
      await authService.resendVerification()
      setResent(true)
      setDeliveryNeedsRetry(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request a new code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="relative z-20 w-full max-w-[460px] rounded-[28px] border border-white/80 bg-white p-8 text-center shadow-blue-tint transition-all sm:p-10">
      <div className="mb-4 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2437F5]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2DE1B9]" />
          {copy.badge}
        </span>
      </div>
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-[#2437F5] shadow-[0_12px_28px_-6px_rgba(36,55,245,0.22)]">
        <MailCheck className="h-10 w-10" />
      </div>
      <h1 className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-[#081233] sm:text-3xl">
        {copy.title}
      </h1>
      <p className="mt-2.5 text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
        {copy.subtitle}
      </p>
      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {resent && (
        <div
          role="status"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> <span>{copy.resent}</span>
        </div>
      )}
      {deliveryNeedsRetry && !resent && (
        <div
          role="status"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-800"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> <span>{copy.deliveryRetry}</span>
        </div>
      )}

      <form onSubmit={(event) => void verify(event)} className="mt-6 grid gap-4 text-left">
        <FormField htmlFor="verification-email" label={copy.email}>
          <Input
            id="verification-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value.trimStart())}
            placeholder="you@example.com"
            required
          />
        </FormField>
        <FormField htmlFor="email-verification-code" label={copy.code} hint={copy.notice}>
          <Input
            id="email-verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            required
          />
        </FormField>
        <button
          type="submit"
          disabled={pending || !targetEmail}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#7B3FF2] py-4 text-[15px] font-bold text-white shadow-[0_12px_28px_-4px_rgba(123,63,242,0.48)] transition hover:bg-[#682bd8] disabled:opacity-50"
        >
          <span>{copy.submit}</span> <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <button
        type="button"
        onClick={() => void resend()}
        disabled={resending || !targetEmail}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#2437F5] transition-colors hover:text-[#7B3FF2] disabled:opacity-50"
      >
        <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
        <span>{copy.resend}</span>
      </button>
      <div className="mt-5">
        <Link href="/login" className="text-xs font-semibold text-slate-500 hover:text-[#2437F5]">
          {copy.signIn}
        </Link>
      </div>
      <div className="mt-7 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-5 text-[11px] font-medium text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-[#2DE1B9]" />
        <span>Single-use code · Email verification required</span>
      </div>
    </div>
  )
}
