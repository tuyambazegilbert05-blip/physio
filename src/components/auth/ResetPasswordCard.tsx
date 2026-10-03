'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Lock, Eye, EyeOff, AlertCircle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ResetPasswordCardProps = {
  lang?: 'en' | 'rw'
}

export function ResetPasswordCard({ lang = 'en' }: ResetPasswordCardProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const t = {
    en: {
      badge: 'Security update',
      title: 'Choose a new password',
      subtitle: 'Create a new, secure password for your account.',
      passwordLabel: 'New password',
      passwordPlaceholder: 'At least 8 characters',
      confirmLabel: 'Confirm new password',
      confirmPlaceholder: 'Repeat your new password',
      passwordHint: 'At least 8 characters with letters and numbers.',
      updateBtn: 'Update password',
      updatingBtn: 'Updating password…',
      successTitle: 'Password updated!',
      successMessage:
        'Your password has been changed securely. You can now access your account.',
      signInBtn: 'Sign in to your account',
      encryptionNote: '256-bit AES encryption · Supabase RLS secure',
    },
    rw: {
      badge: 'Umutekano',
      title: 'Hitamo ijambobanga rishya',
      subtitle: 'Kora ijambobanga rishya kandi ryizewe rya konti yawe.',
      passwordLabel: 'Ijambobanga rishya',
      passwordPlaceholder: 'Byibuze inyuguti 8',
      confirmLabel: 'Emeza ijambobanga rishya',
      confirmPlaceholder: 'Subiramo ijambobanga rishya',
      passwordHint: 'Byibuze inyuguti 8 zirimo imibare n’inyuguti.',
      updateBtn: 'Vugurura ijambobanga',
      updatingBtn: 'Kuvugurura…',
      successTitle: 'Ijambobanga ryahinduwe!',
      successMessage:
        'Ijambobanga ryawe ryahinduwe mu mutekano. Ubu ushobora kwinjira muri konti yawe.',
      signInBtn: 'Injira muri konti yawe',
      encryptionNote: 'Umutekano wizewe wa 256-bit AES RLS',
    },
  }[lang]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.')
      return
    }

    setPending(true)
    try {
      const { error: authError } = await createClient().auth.updateUser({ password })
      if (authError) throw authError
      setSaved(true)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to update the password. Please try again.'
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

      {saved ? (
        /* SUCCESS STATE */
        <div className="py-4 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-[#2437F5] shadow-[0_8px_20px_-4px_rgba(36,55,245,0.25)]">
            <CheckCircle2 className="h-8 w-8 text-[#2437F5]" />
          </div>

          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
            {t.successTitle}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
            {t.successMessage}
          </p>

          <div className="mt-8">
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 py-4 rounded-[14px] bg-[#7B3FF2] hover:bg-[#682bd8] text-white font-heading font-bold text-[15px] shadow-[0_12px_28px_-4px_rgba(123,63,242,0.48)] hover:shadow-[0_16px_32px_-4px_rgba(123,63,242,0.58)] transition-all active:scale-[0.99]"
            >
              <span>{t.signInBtn}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
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

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            {/* New Password */}
            <div>
              <label
                htmlFor="reset-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                {t.passwordLabel}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="reset-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-10 pr-11 text-sm font-semibold text-[#081233] placeholder-slate-400 transition-all focus:border-[#2437F5] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2437F5]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="reset-confirm"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                {t.confirmLabel}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="reset-confirm"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-10 pr-11 text-sm font-semibold text-[#081233] placeholder-slate-400 transition-all focus:border-[#2437F5] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2437F5]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 font-medium font-sans">
                {t.passwordHint}
              </p>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full py-4 rounded-[14px] bg-[#7B3FF2] hover:bg-[#682bd8] disabled:opacity-70 text-white font-heading font-bold text-[15px] shadow-[0_12px_28px_-4px_rgba(123,63,242,0.48)] hover:shadow-[0_16px_32px_-4px_rgba(123,63,242,0.58)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {pending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t.updatingBtn}</span>
                </>
              ) : (
                <span>{t.updateBtn}</span>
              )}
            </button>
          </form>
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
