'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { MailCheck, ArrowRight, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

type VerifyEmailCardProps = {
  lang?: 'en' | 'rw'
}

export function VerifyEmailCard({ lang = 'en' }: VerifyEmailCardProps) {
  const searchParams = useSearchParams()
  const targetEmail = searchParams.get('email') || ''
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  const t = {
    en: {
      badge: 'Account activation',
      title: 'Check your email',
      subtitle:
        'We sent a secure activation link to your inbox. Follow the link to verify your account and join your savings group.',
      notice: 'Did not receive it? Be sure to check your spam or junk folder.',
      resendPrompt: 'Didn’t get the email?',
      resendBtn: 'Resend verification link',
      resendingBtn: 'Resending…',
      resentSuccess: 'A new verification link has been sent to your inbox!',
      signInBtn: 'Proceed to sign in',
      encryptionNote: '256-bit AES encryption · Supabase RLS secure',
    },
    rw: {
      badge: 'Gufungura konti',
      title: 'Reba imeyili yawe',
      subtitle:
        'Twohereje umurongo wo kwemeza konti muri imeyili yawe. Kanda kuri uwo murongo wemeze konti ubone kwinjira mu kimina.',
      notice: 'Ntayo wabonye? Reba no mu bubiko bwa spam.',
      resendPrompt: 'Ntiwabonye imeyili?',
      resendBtn: 'Ongera wohereze umurongo',
      resendingBtn: 'Kohereza…',
      resentSuccess: 'Umurongo mushya woherejwe muri imeyili yawe!',
      signInBtn: 'Komeza winjire',
      encryptionNote: 'Umutekano wizewe wa 256-bit AES RLS',
    },
  }[lang]

  async function handleResend() {
    if (!targetEmail) return
    setError('')
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })
      if (!res.ok) throw new Error('Failed to resend verification email')
      setResent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resending email')
    } finally {
      setResending(false)
    }
  }

  return (
    <div
      style={{ borderRadius: '28px', backgroundColor: '#FFFFFF' }}
      className="relative z-20 w-full max-w-[460px] border border-white/80 p-8 sm:p-10 shadow-blue-tint transition-all select-none text-center"
    >
      {/* Top Tagline Badge */}
      <div className="mb-4 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2437F5]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2DE1B9] animate-pulse" />
          {t.badge}
        </span>
      </div>

      {/* Central Illustration Badge */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-[#2437F5] shadow-[0_12px_28px_-6px_rgba(36,55,245,0.22)]">
        <MailCheck className="h-10 w-10 text-[#2437F5]" />
      </div>

      <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#081233] leading-tight">
        {t.title}
      </h1>
      <p className="mt-2.5 text-xs sm:text-sm font-medium text-slate-500 leading-relaxed font-sans">
        {t.subtitle}
      </p>

      {targetEmail && (
        <div className="mt-4 inline-block rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2 text-xs font-bold text-[#2437F5]">
          {targetEmail}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resent && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{t.resentSuccess}</span>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-500 font-medium">
        {t.notice}
      </div>

      {targetEmail && !resent && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2437F5] hover:text-[#7B3FF2] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? t.resendingBtn : t.resendBtn}</span>
          </button>
        </div>
      )}

      <div className="mt-7">
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 py-4 rounded-[14px] bg-[#7B3FF2] hover:bg-[#682bd8] text-white font-heading font-bold text-[15px] shadow-[0_12px_28px_-4px_rgba(123,63,242,0.48)] hover:shadow-[0_16px_32px_-4px_rgba(123,63,242,0.58)] transition-all active:scale-[0.99]"
        >
          <span>{t.signInBtn}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Trust & Encryption Footer */}
      <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-[#2DE1B9]" />
        <span>{t.encryptionNote}</span>
      </div>
    </div>
  )
}
