'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { User, Mail, Smartphone, AlertCircle, ShieldCheck } from 'lucide-react'
import { registerSchema } from '@/features/auth/schemas/auth.schema'
import { authService } from '@/features/auth/services/auth.service'
import { PasswordPolicyFields } from '@/features/auth/components/PasswordPolicyFields'

type SignUpCardProps = {
  lang?: 'en' | 'rw'
}

export function SignUpCard({ lang = 'en' }: SignUpCardProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const t = {
    en: {
      badge: 'Start together',
      title: 'Create your account',
      subtitle: 'Join Physio Fund Circle to save and grow with your group.',
      nameLabel: 'Full name',
      namePlaceholder: 'e.g. Mukamana Alice',
      emailLabel: 'Email address',
      emailPlaceholder: 'you@example.com',
      phoneLabel: 'Phone number',
      phonePlaceholder: '+250 7XX XXX XXX',
      passwordLabel: 'Password',
      passwordHint: 'At least 8 characters with letters & numbers.',
      createBtn: 'Create account',
      creatingBtn: 'Creating your account…',
      alreadyRegistered: 'Already registered?',
      signIn: 'Sign in',
      encryptionNote: '256-bit AES encryption · Supabase RLS secure',
    },
    rw: {
      badge: 'Dutangirane',
      title: 'Fungura konti yawe',
      subtitle: 'Injira muri Physio Fund Circle ubike kandi ukurane n’itsinda ryawe.',
      nameLabel: 'Amazina yose',
      namePlaceholder: 'urugero: Mukamana Alice',
      emailLabel: 'Imeri yawe',
      emailPlaceholder: 'wowe@urugero.com',
      phoneLabel: 'Nimero ya telefone',
      phonePlaceholder: '+250 7XX XXX XXX',
      passwordLabel: 'Ijambobanga',
      passwordHint: 'Byibuze inyuguti 8 zirimo imibare n’inyuguti.',
      createBtn: 'Fungura konti',
      creatingBtn: 'Kurema konti…',
      alreadyRegistered: 'Ubusanzwe ufite konti?',
      signIn: 'Injira',
      encryptionNote: 'Umutekano wizewe wa 256-bit AES RLS',
    },
  }[lang]

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const parsed = registerSchema.safeParse({ fullName, email, phone, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setPending(true)
    try {
      const result = await authService.register(parsed.data)
      const query = new URLSearchParams({ email: parsed.data.email })
      if (!result.emailSent) query.set('delivery', 'retry')
      router.push(`/verify-email?${query.toString()}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registration failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      style={{ borderRadius: '28px', backgroundColor: '#FFFFFF' }}
      className="relative z-20 w-full max-w-[460px] border border-white/80 p-8 shadow-blue-tint transition-all"
    >
      {/* Top Tagline Badge */}
      <div className="mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2437F5]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2DE1B9] animate-pulse" />
          {t.badge}
        </span>
      </div>

      {/* Heading */}
      <h1 className="font-heading text-2xl font-bold tracking-tight text-[#081233] sm:text-3xl">
        {t.title}
      </h1>
      <p className="mt-1.5 text-xs text-slate-500 sm:text-sm font-medium leading-relaxed">
        {t.subtitle}
      </p>

      {/* Error Notice */}
      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span className="font-medium leading-tight">{error}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={submit} className="mt-6 space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="register-fullname"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
          >
            {t.nameLabel}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              id="register-fullname"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-4 text-sm font-semibold text-[#081233] placeholder-slate-400 transition-all focus:border-[#2437F5] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2437F5]/15"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label
            htmlFor="register-email"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
          >
            {t.emailLabel}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="register-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-4 text-sm font-semibold text-[#081233] placeholder-slate-400 transition-all focus:border-[#2437F5] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2437F5]/15"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label
            htmlFor="register-phone"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            {t.phoneLabel}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Smartphone className="h-4 w-4" />
            </div>
            <input
              id="register-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-4 text-sm font-semibold text-[#081233] placeholder-slate-400 transition-all focus:border-[#2437F5] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2437F5]/15"
            />
          </div>
        </div>

        <PasswordPolicyFields
          prefix="register-card"
          password={password}
          confirmation={confirmation}
          onPasswordChange={setPassword}
          onConfirmationChange={setConfirmation}
        />

        {/* Create Account Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] py-3.5 text-center text-sm font-bold text-white shadow-[0_12px_24px_-4px_rgba(36,55,245,0.35)] transition-all duration-200 hover:opacity-95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? t.creatingBtn : t.createBtn}
          </button>
        </div>

        {/* Sign In Link */}
        <div className="pt-2 text-center">
          <p className="text-xs text-slate-500 font-medium">
            {t.alreadyRegistered}{' '}
            <Link
              href="/login"
              className="font-bold text-[#2437F5] hover:text-[#7B3FF2] transition-colors"
            >
              {t.signIn}
            </Link>
          </p>
        </div>
      </form>

      {/* Security Footer Note */}
      <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-center">
        <ShieldCheck className="h-3.5 w-3.5 text-[#2DE1B9]" />
        <span className="text-[11px] text-slate-400 font-medium">
          {t.encryptionNote}
        </span>
      </div>
    </div>
  )
}
