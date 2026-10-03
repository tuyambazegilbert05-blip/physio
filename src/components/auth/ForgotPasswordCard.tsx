'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Mail, ArrowLeft, AlertCircle, ShieldCheck, CheckCircle2, Send } from 'lucide-react'

type ForgotPasswordCardProps = {
  lang?: 'en' | 'rw'
}

export function ForgotPasswordCard({ lang = 'en' }: ForgotPasswordCardProps) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const t = {
    en: {
      badge: 'Account recovery',
      title: 'Reset your password',
      subtitle: "Enter your account email and we'll send you secure recovery instructions.",
      emailLabel: 'Email address',
      emailPlaceholder: 'you@example.com',
      sendBtn: 'Send recovery link',
      sendingBtn: 'Sending recovery link…',
      sentTitle: 'Check your inbox',
      sentMessage:
        'If an account exists for this address, a password reset link has been dispatched.',
      resendBtn: 'Resend recovery link',
      backToSignIn: 'Back to sign in',
      rememberPassword: 'Remember your password?',
      signIn: 'Sign in',
      encryptionNote: '256-bit AES encryption · Supabase RLS secure',
    },
    rw: {
      badge: 'Gusubiza ijambobanga',
      title: 'Hindura ijambobanga',
      subtitle:
        'Shyiramo imeyili yawe tukwoherereze amabwiriza yo guhindura ijambobanga mu mutekano.',
      emailLabel: 'Aderesi ya imeyili',
      emailPlaceholder: 'wowe@urugero.com',
      sendBtn: 'Ohereza umurongo wo guhindura',
      sendingBtn: 'Kohereza…',
      sentTitle: 'Reba ubutumwa bwawe',
      sentMessage:
        'Niba iyi aderesi ifite konti, umurongo wo guhindura ijambobanga woherejwe.',
      resendBtn: 'Ongera wohereze',
      backToSignIn: 'Subira kwinjira',
      rememberPassword: 'Wibutse ijambobanga?',
      signIn: 'Injira',
      encryptionNote: 'Umutekano wizewe wa 256-bit AES RLS',
    },
  }[lang]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.')
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok || result?.error) {
        throw new Error(
          result?.error?.message || 'Unable to send a reset link. Please try again.'
        )
      }
      setSent(true)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to send a reset link. Please try again.'
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      style={{ borderRadius: '28px', backgroundColor: '#FFFFFF' }}
      className="relative z-20 w-full max-w-[460px] border border-white/80 p-8 sm:p-10 shadow-blue-tint transition-all select-none"
    >
      {/* Top Tagline Badge */}
      <div className="mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2437F5]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2DE1B9] animate-pulse" />
          {t.badge}
        </span>
      </div>

      {sent ? (
        /* SUCCESS STATE */
        <div className="py-4 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-[#2437F5] shadow-[0_8px_20px_-4px_rgba(36,55,245,0.25)]">
            <CheckCircle2 className="h-8 w-8 text-[#2437F5]" />
          </div>

          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
            {t.sentTitle}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
            {t.sentMessage}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs font-semibold text-[#081233]">
            {email}
          </div>

          <div className="mt-8 space-y-3">
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 py-4 rounded-[14px] bg-[#7B3FF2] hover:bg-[#682bd8] text-white font-heading font-bold text-[15px] shadow-[0_12px_28px_-4px_rgba(123,63,242,0.48)] hover:shadow-[0_16px_32px_-4px_rgba(123,63,242,0.58)] transition-all active:scale-[0.99]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t.backToSignIn}</span>
            </Link>

            <button
              type="button"
              onClick={() => setSent(false)}
              className="w-full py-3 text-xs font-bold text-slate-500 hover:text-[#2437F5] transition-colors"
            >
              {t.resendBtn}
            </button>
          </div>
        </div>
      ) : (
        /* FORM STATE */
        <>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#081233] leading-tight">
            {t.title}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-500 leading-relaxed font-sans">
            {t.subtitle}
          </p>

          {/* Error Notice */}
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-700 animate-in fade-in duration-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span className="font-medium leading-tight">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                {t.emailLabel}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-10 pr-4 text-sm font-semibold text-[#081233] placeholder-slate-400 transition-all focus:border-[#2437F5] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2437F5]/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="relative w-full py-4 rounded-[14px] bg-[#7B3FF2] hover:bg-[#682bd8] disabled:opacity-70 text-white font-heading font-bold text-[15px] shadow-[0_12px_28px_-4px_rgba(123,63,242,0.48)] hover:shadow-[0_16px_32px_-4px_rgba(123,63,242,0.58)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {pending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t.sendingBtn}</span>
                </>
              ) : (
                <>
                  <span>{t.sendBtn}</span>
                  <Send className="h-4 w-4 ml-1 opacity-80" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Back to Sign In Link */}
          <div className="mt-7 text-center">
            <p className="text-xs text-slate-500 font-medium font-sans">
              {t.rememberPassword}{' '}
              <Link
                href="/login"
                className="font-bold text-[#2437F5] hover:text-[#7B3FF2] transition-colors"
              >
                {t.signIn}
              </Link>
            </p>
          </div>
        </>
      )}

      {/* Trust & Encryption Footer */}
      <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-[#2DE1B9]" />
        <span>{t.encryptionNote}</span>
      </div>
    </div>
  )
}
