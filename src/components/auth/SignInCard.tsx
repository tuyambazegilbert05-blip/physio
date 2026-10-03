'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AlertCircle, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, Smartphone } from 'lucide-react'
import { loginSchema } from '@/features/auth/schemas/auth.schema'
import { authService } from '@/features/auth/services/auth.service'

type AuthState = 'default' | 'wrong-password' | 'signing-in' | 'signed-in'

type SignInCardProps = {
  lang?: 'en' | 'rw'
}

export function SignInCard({ lang = 'en' }: SignInCardProps) {
  const router = useRouter()
  const search = useSearchParams()

  // Form inputs
  const [email, setEmail] = useState('you@example.com')
  const [password, setPassword] = useState('••••••••••••')
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [isPhoneMode, setIsPhoneMode] = useState(false)
  const [phone, setPhone] = useState('078 000 0000')

  // Auth & UI States
  const [uiState, setUiState] = useState<AuthState>(() => {
    const initialMsg = search.get('message')
    return initialMsg ? 'wrong-password' : 'default'
  })
  const [errorMessage, setErrorMessage] = useState(
    "That email and password don't match. Try again or reset your password."
  )
  const [userName, setUserName] = useState('Gilbert')
  const [showStatePicker, setShowStatePicker] = useState(false)

  // Language text mapping
  const t = {
    en: {
      welcomeBack: 'Welcome back',
      subtitle: 'Sign in to your Phyaio Cycle group.',
      emailLabel: 'Email address',
      passwordLabel: 'Password',
      phoneLabel: 'Phone number',
      keepSignedIn: 'Keep me signed in',
      forgotPassword: 'Forgot password?',
      signIn: 'Sign in',
      signingIn: 'Signing in',
      or: 'or',
      phoneOption: 'Continue with phone number',
      emailOption: 'Continue with email instead',
      newToPhyaioCycle: 'New to Phyaio Cycle?',
      createAccount: 'Create an account',
      incorrectPassword: 'Incorrect password',
      welcomeGilbert: `Welcome back, ${userName}`,
      openingDashboard: 'Opening your group dashboard',
      goToDashboard: 'Go to dashboard',
      secureNote: 'Secure group savings management',
    },
    rw: {
      welcomeBack: 'Murakaza neza',
      subtitle: 'Injira mu kimina cyawe.',
      emailLabel: 'Aderesi ya imeyili',
      passwordLabel: 'Ijambobanga',
      phoneLabel: 'Nimero ya telefone',
      keepSignedIn: 'Mpa kwinjira',
      forgotPassword: 'Wibagiwe ijambobanga?',
      signIn: 'Injira',
      signingIn: 'Kwinjira...',
      or: 'cyangwa',
      phoneOption: 'Komeza ukoresheje telefone',
      emailOption: 'Komeza ukoresheje imeyili',
      newToPhyaioCycle: 'Muri bashya muri Phyaio Cycle?',
      createAccount: 'Fungura konti',
      incorrectPassword: 'Ijambobanga si ryo',
      welcomeGilbert: `Murakaza neza, ${userName}`,
      openingDashboard: 'Dufungura ikibaho cy’itsinda ryawe',
      goToDashboard: 'Komeza ku kibaho',
      secureNote: 'Umutekano wizewe mu micungire y’Phyaio Cycle',
    },
  }[lang]

  // Form submit handler
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uiState === 'signing-in') return

    if (isPhoneMode) {
      setUiState('signing-in')
      setTimeout(() => {
        setUiState('signed-in')
        setTimeout(() => {
          router.replace('/dashboard')
        }, 1500)
      }, 1200)
      return
    }

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Please check your email and password.')
      setUiState('wrong-password')
      return
    }

    setUiState('signing-in')

    try {
      await authService.login(parsed.data)
      const inferredName = email.split('@')[0]
      const capitalized = inferredName.charAt(0).toUpperCase() + inferredName.slice(1)
      setUserName(capitalized || 'Gilbert')

      setUiState('signed-in')
      const next = search.get('next')
      const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
      setTimeout(() => {
        router.replace(target)
        router.refresh()
      }, 1400)
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : "That email and password don't match. Try again or reset your password."
      )
      setUiState('wrong-password')
    }
  }

  function handleGoToDashboard() {
    const next = search.get('next')
    const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
    router.replace(target)
  }

  return (
    <div className="relative w-full max-w-[460px] mx-auto select-none">
      {/* Main Sign-in Card */}
      <div className="relative bg-white rounded-[28px] p-8 sm:p-10 shadow-[0_24px_64px_-12px_rgba(36,55,245,0.12),0_0_0_1px_rgba(36,55,245,0.04)] border border-slate-100/60 transition-all duration-300">
        {/* SIGNED-IN STATE */}
        {uiState === 'signed-in' ? (
          <div className="flex flex-col items-center justify-center text-center py-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Logo with radiant halo */}
            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-gradient-to-tr from-cyan-400/30 via-violet-500/25 to-indigo-500/20 blur-xl rounded-full" />
              <div
                style={{ width: '120px', height: '120px' }}
                className="relative z-10 flex items-center justify-center overflow-hidden"
              >
                <Image
                  src="/animated_log/logo_assemble_transparent.gif"
                  alt="Phyaio Cycle Logo"
                  width={120}
                  height={120}
                  unoptimized
                  priority
                  style={{
                    width: '120px',
                    height: '120px',
                    maxWidth: '120px',
                    maxHeight: '120px',
                    objectFit: 'contain',
                  }}
                  className="drop-shadow-[0_12px_24px_rgba(36,55,245,0.2)] select-none pointer-events-none"
                />
              </div>
            </div>

            <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#081233] tracking-tight">
              {t.welcomeGilbert}
            </h3>
            <p className="font-sans text-sm text-[#657089] mt-2 mb-8">{t.openingDashboard}</p>

            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full py-4 rounded-[14px] bg-[#7B3FF2] hover:bg-[#682bd8] text-white font-heading font-bold text-[15px] shadow-[0_12px_28px_-4px_rgba(123,63,242,0.48)] hover:shadow-[0_16px_32px_-4px_rgba(123,63,242,0.58)] transition-all active:scale-[0.99] cursor-pointer"
            >
              {t.goToDashboard}
            </button>
          </div>
        ) : (
          /* DEFAULT, WRONG-PASSWORD, & SIGNING-IN STATES */
          <form onSubmit={handleSubmit} noValidate>
            {/* Card Header */}
            <div className="mb-7">
              <h2 className="font-heading font-extrabold text-[30px] sm:text-[32px] text-[#081233] tracking-tight leading-tight">
                {t.welcomeBack}
              </h2>
              <p className="font-sans text-[15px] text-[#657089] mt-1.5 font-normal">{t.subtitle}</p>
            </div>

            {/* Wrong Password State Alert Banner */}
            {uiState === 'wrong-password' && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-[14px] bg-rose-50/90 border border-rose-200/80 p-3.5 text-xs sm:text-[13px] text-rose-800 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="leading-snug">{errorMessage}</p>
              </div>
            )}

            {/* Form Fields Container */}
            <div className="space-y-4">
              {/* Email or Phone Input */}
              {!isPhoneMode ? (
                <div>
                  <label htmlFor="card-email" className="block text-[13px] font-semibold text-[#081233] mb-2 font-sans">
                    {t.emailLabel}
                  </label>
                  <div className="relative rounded-[14px] border-2 border-[#7B3FF2] shadow-[0_0_0_4px_rgba(123,63,242,0.12)] bg-white transition-all">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#7B3FF2]" />
                    <input
                      id="card-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (uiState === 'wrong-password') setUiState('default')
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      className="w-full bg-transparent py-3.5 pl-11 pr-4 text-[15px] text-[#081233] font-sans font-medium outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="card-phone" className="block text-[13px] font-semibold text-[#081233] mb-2 font-sans">
                    {t.phoneLabel}
                  </label>
                  <div className="relative flex items-center rounded-[14px] border-2 border-[#7B3FF2] shadow-[0_0_0_4px_rgba(123,63,242,0.12)] bg-white transition-all">
                    <span className="pl-4 pr-2 text-xs font-bold text-slate-500 border-r border-slate-200">
                      🇷🇼 +250
                    </span>
                    <input
                      id="card-phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="078 000 0000"
                      required
                      className="w-full bg-transparent py-3.5 px-3 text-[15px] text-[#081233] font-sans font-medium outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              {!isPhoneMode && (
                <div>
                  <label htmlFor="card-password" className="block text-[13px] font-semibold text-[#081233] mb-2 font-sans">
                    {t.passwordLabel}
                  </label>
                  <div
                    className={`relative rounded-[14px] border bg-[#F8FAFC] transition-all ${
                      uiState === 'wrong-password'
                        ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-400/20'
                        : 'border-slate-200/90 focus-within:border-[#7B3FF2] focus-within:ring-4 focus-within:ring-[#7B3FF2]/15'
                    }`}
                  >
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                    <input
                      id="card-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (uiState === 'wrong-password') setUiState('default')
                      }}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full bg-transparent py-3.5 pl-11 pr-11 text-[15px] text-[#081233] font-sans outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                  {/* Wrong Password Field Error Note */}
                  {uiState === 'wrong-password' && (
                    <p className="text-rose-600 text-xs font-medium mt-1.5 pl-1 animate-in fade-in duration-150 font-sans">
                      {t.incorrectPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Keep signed in & Forgot password row */}
              {!isPhoneMode && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <span
                      onClick={() => setKeepSignedIn(!keepSignedIn)}
                      className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all ${
                        keepSignedIn
                          ? 'bg-[#7B3FF2] text-white shadow-xs'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {keepSignedIn && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                    <span
                      onClick={() => setKeepSignedIn(!keepSignedIn)}
                      className="text-[13px] font-medium text-[#475569] font-sans"
                    >
                      {t.keepSignedIn}
                    </span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-[13px] font-semibold text-[#2563EB] hover:text-[#7B3FF2] transition-colors font-sans"
                  >
                    {t.forgotPassword}
                  </Link>
                </div>
              )}

              {/* Primary Sign-in Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uiState === 'signing-in'}
                  className="w-full py-4 rounded-[14px] bg-[#7B3FF2] hover:bg-[#682bd8] disabled:opacity-90 text-white font-heading font-bold text-[15px] shadow-[0_12px_28px_-4px_rgba(123,63,242,0.48)] hover:shadow-[0_16px_32px_-4px_rgba(123,63,242,0.58)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {uiState === 'signing-in' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t.signingIn}</span>
                    </>
                  ) : (
                    <span>{t.signIn}</span>
                  )}
                </button>
              </div>

              {/* Signing-in State Secondary Indicator: 3 orbit-colored dots */}
              {uiState === 'signing-in' && (
                <div className="pt-4 pb-1 flex flex-col items-center justify-center animate-in fade-in duration-300">
                  <div className="relative mb-3 flex items-center justify-center">
                    <div
                      style={{ width: '64px', height: '64px' }}
                      className="relative flex items-center justify-center overflow-hidden"
                    >
                      <Image
                        src="/animated_log/logo_assemble_transparent.gif"
                        alt="Phyaio Cycle Logo"
                        width={64}
                        height={64}
                        unoptimized
                        priority
                        style={{
                          width: '64px',
                          height: '64px',
                          maxWidth: '64px',
                          maxHeight: '64px',
                          objectFit: 'contain',
                        }}
                        className="opacity-90 select-none pointer-events-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full bg-[#1FB8F0] animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-[#2437F5] animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-[#7B3FF2] animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="relative py-2.5 select-none">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-normal lowercase font-sans">{t.or}</span>
                </div>
              </div>

              {/* Continue with Phone Number / Email Secondary Action */}
              <button
                type="button"
                onClick={() => setIsPhoneMode(!isPhoneMode)}
                className="w-full py-3.5 rounded-[14px] border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-[14px] font-semibold text-[#081233] transition-all flex items-center justify-center gap-2.5 shadow-xs cursor-pointer font-sans"
              >
                <Smartphone className="w-[18px] h-[18px] text-[#7B3FF2]" />
                <span>{isPhoneMode ? t.emailOption : t.phoneOption}</span>
              </button>

              {/* Create Account Link */}
              <div className="text-center pt-2.5">
                <p className="text-[13px] text-[#64748B] font-sans">
                  {t.newToPhyaioCycle}{' '}
                  <Link
                    href="/register"
                    className="font-bold text-[#7B3FF2] hover:text-[#2437F5] hover:underline transition-colors"
                  >
                    {t.createAccount}
                  </Link>
                </p>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Security Note Beneath Card */}
      <div className="flex items-center justify-center gap-1.5 mt-6 text-[12px] text-[#64748B] select-none">
        <ShieldCheck className="w-4 h-4 text-[#2DE1B9]" />
        <span className="font-sans font-medium">{t.secureNote}</span>
      </div>

    </div>
  )
}
