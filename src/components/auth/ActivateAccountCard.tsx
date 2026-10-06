'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  RefreshCw,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react'
import { authService } from '@/features/auth/services/auth.service'
import { FormField } from '@/components/forms/FormField'
import { FormError } from '@/components/forms/FormError'
import { Input } from '@/components/ui/Input'

type Step = 'details' | 'verify' | 'completed'

interface ActivateAccountCardProps {
  lang?: 'en' | 'rw'
}

export function ActivateAccountCard({ lang = 'en' }: ActivateAccountCardProps) {
  const router = useRouter()

  // Profile data from legacy migration
  const [profileLoading, setProfileLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [legacyId, setLegacyId] = useState('')
  const [temporaryEmail, setTemporaryEmail] = useState('')
  const [groupName, setGroupName] = useState('Physio Fund Circle')
  const [groupId, setGroupId] = useState<string | null>(null)

  // User input fields
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')

  // State
  const [step, setStep] = useState<Step>('details')
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    authService
      .getMigrationProfile()
      .then((data) => {
        if (!active) return
        setFullName(data.fullName || '')
        setLegacyId(data.legacyId || '')
        setTemporaryEmail(data.temporaryEmail || '')
        if (data.groupName) setGroupName(data.groupName)
        if (data.groupId) setGroupId(data.groupId)
        setProfileLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Could not load migration profile.')
        setProfileLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Step 1: Request OTP code for new real email
  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')

    const cleanEmail = newEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(lang === 'en' ? 'Please enter a valid personal email address.' : 'Injiza imeri yukuri.')
      return
    }

    if (!newPhone.trim()) {
      setError(lang === 'en' ? 'Please enter your personal phone number.' : 'Injiza numero ya terefone yawe.')
      return
    }

    if (!newPassword || newPassword.length < 8) {
      setError(
        lang === 'en'
          ? 'Password must be at least 8 characters long.'
          : 'Ijambobanga rigomba kugira inyuguti byibura 8.',
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setError(lang === 'en' ? 'Passwords do not match.' : 'Amagambobanga ntabwo ahuye.')
      return
    }

    setPending(true)
    try {
      const res = await authService.requestClaimOtp(cleanEmail)
      setNotice(
        res.message ||
          (lang === 'en'
            ? 'Verification code sent to your real email.'
            : 'Kode yemeza yoherejwe kuri imeri yawe.'),
      )
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code.')
    } finally {
      setPending(false)
    }
  }

  // Step 2: Resend OTP
  async function handleResendOtp() {
    setError('')
    setResending(true)
    try {
      await authService.requestClaimOtp(newEmail.trim().toLowerCase())
      setNotice(
        lang === 'en'
          ? 'A fresh 6-digit verification code has been sent.'
          : 'Kode nshya y imibare 6 yoherejwe.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification code.')
    } finally {
      setResending(false)
    }
  }

  // Step 3: Finalize Account Claim & Activation
  async function handleFinalizeClaim(e: FormEvent) {
    e.preventDefault()
    setError('')

    const cleanCode = code.trim()
    if (!/^\d{6}$/.test(cleanCode)) {
      setError(lang === 'en' ? 'Please enter the 6-digit verification code.' : 'Injiza kode y imibare 6.')
      return
    }

    setPending(true)
    try {
      await authService.claimAccount({
        fullName: fullName.trim(),
        newEmail: newEmail.trim().toLowerCase(),
        newPhone: newPhone.trim(),
        newPassword,
        avatarUrl: avatarUrl.trim() || null,
        code: cleanCode,
      })
      setStep('completed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate account.')
    } finally {
      setPending(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-[340px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm font-bold text-violet-700">
          <RefreshCw className="h-5 w-5 animate-spin" />{' '}
          {lang === 'en' ? 'Loading your migration profile…' : 'Gushakisha umwirondoro…'}
        </div>
      </div>
    )
  }

  if (step === 'completed') {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white/95 p-6 md:p-8 shadow-xl backdrop-blur-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="mt-4 text-center">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            {lang === 'en' ? 'Account Activated' : 'Konti Yemejwe'}
          </span>
          <h2 className="mt-2 font-heading text-2xl font-black text-[#081233]">
            {lang === 'en' ? `Welcome, ${fullName}!` : `Murakaza neza, ${fullName}!`}
          </h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            {lang === 'en'
              ? `Your personal credentials are now active. All your historical contributions, shares, and records in ${groupName} are linked directly to your verified account.`
              : `Konti yawe ubu iriteguye. Imisanzu, imigabane, n amakuru yawe muri ${groupName} byose byahujwe na konti yawe nshya.`}
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              const dest = groupId ? `/dashboard?group=${encodeURIComponent(groupId)}` : '/dashboard'
              router.replace(dest)
              router.refresh()
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#7B3FF2]/20 hover:opacity-95 transition"
          >
            {lang === 'en' ? 'Enter Group Workspace' : 'Injira mu Itsinda'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-indigo-100/80 bg-white/95 p-6 md:p-8 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-violet-100/70 px-3 py-1 text-xs font-bold text-violet-800">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" />{' '}
          {lang === 'en' ? 'Account Activation & Claim' : 'Gufata No Kwemeza Konti'}
        </div>
        <h2 className="mt-2 font-heading text-2xl font-black text-[#231044]">
          {lang === 'en' ? 'Take Ownership of Your Account' : 'Injiza Amakuru Yawe Nyakuri'}
        </h2>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          {lang === 'en'
            ? `Your membership in ${groupName} was migrated from Google Sheet records. Set your real email, phone, and password to activate permanent access.`
            : `Umwirondoro wawe muri ${groupName} wimuwe muri Google Sheet. Shyiramo imeri, terefone, n ijambobanga byawe byiteka.`}
        </p>
      </div>

      {/* Migration Metadata Card */}
      <div className="mt-5 rounded-2xl border border-indigo-50 bg-indigo-50/40 p-3.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold text-[#081233]">{fullName}</span>
            {legacyId && <span className="ml-2 font-mono text-slate-400">({legacyId})</span>}
          </div>
          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-100">
            {groupName}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 truncate">
          {lang === 'en' ? 'Temporary login ID: ' : 'Icyangombwa cy agateganyo: '}
          <span className="font-mono">{temporaryEmail}</span>
        </p>
      </div>

      <FormError message={error} />
      {notice && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-100">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {notice}
        </div>
      )}

      {/* Step 1: Input Real Details & Password */}
      {step === 'details' && (
        <form onSubmit={handleRequestOtp} className="mt-5 grid gap-4">
          <FormField htmlFor="claim-fullname" label={lang === 'en' ? 'Full name' : 'Amazina yose'}>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="claim-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </FormField>

          <FormField
            htmlFor="claim-email"
            label={lang === 'en' ? 'Real personal email address' : 'Imeri yawe nyakuri'}
            hint={
              lang === 'en'
                ? 'We will send a 6-digit verification code to confirm this email.'
                : 'Tuzakohereza kode y imibare 6 yo kwemeza iyi meri.'
            }
          >
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="claim-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="youremail@gmail.com"
                className="pl-10"
                required
                autoFocus
              />
            </div>
          </FormField>

          <FormField
            htmlFor="claim-phone"
            label={lang === 'en' ? 'Personal phone number' : 'Numero ya terefone'}
            hint={
              lang === 'en'
                ? 'Required for group updates and Mobile Money references.'
                : 'Ikenewe kuri Mobile Money n amatangazo y itsinda.'
            }
          >
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="claim-phone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="078... or +250 78..."
                className="pl-10"
                required
              />
            </div>
          </FormField>

          <FormField
            htmlFor="claim-avatar"
            label={lang === 'en' ? 'Profile picture / Avatar URL (Optional)' : 'Ifoto yawe (Ntabwo ari itegeko)'}
            hint={
              lang === 'en'
                ? 'Direct image URL for your profile photo if available.'
                : 'Ihuza ry ifoto yawe niba urifite.'
            }
          >
            <div className="relative">
              <ImageIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="claim-avatar"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField
            htmlFor="claim-password"
            label={lang === 'en' ? 'New permanent password' : 'Ijambobanga rishya'}
            hint={
              lang === 'en'
                ? 'At least 8 characters with letters, numbers, and symbols.'
                : 'Byibura inyuguti 8 zirimo imibare n ibimenyetso.'
            }
          >
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="claim-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>

          <FormField
            htmlFor="claim-confirm-password"
            label={lang === 'en' ? 'Confirm password' : 'Subiramo ijambobanga'}
          >
            <Input
              id="claim-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </FormField>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#7B3FF2]/20 hover:opacity-95 transition disabled:opacity-60"
          >
            {pending ? (
              lang === 'en' ? 'Sending code…' : 'Kohereza kode…'
            ) : (
              <>
                {lang === 'en' ? 'Send Verification Code' : 'Ohereza Kode Yemeza'}{' '}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Verification OTP Code */}
      {step === 'verify' && (
        <form onSubmit={handleFinalizeClaim} className="mt-5 grid gap-4">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 text-xs text-slate-600">
            <p className="font-bold text-[#231044]">
              {lang === 'en' ? 'Enter the 6-digit code sent to:' : 'Shyiramo kode yoherejwe kuri:'}{' '}
              <strong className="text-violet-800">{newEmail}</strong>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {lang === 'en'
                ? 'The code confirms ownership of your email and activates your account.'
                : 'Kode yemeza nyirubwite wa imeri no gutangiza konti yawe.'}
            </p>
          </div>

          <FormField
            htmlFor="claim-code"
            label={lang === 'en' ? '6-Digit Verification Code' : 'Kode y imibare 6'}
          >
            <Input
              id="claim-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="text-center font-mono text-xl tracking-widest font-bold"
              required
              autoFocus
            />
          </FormField>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setStep('details')}
              className="font-bold text-slate-500 hover:text-slate-800"
            >
              {lang === 'en' ? '← Back to details' : '← Garuka inyuma'}
            </button>
            <button
              type="button"
              disabled={resending}
              onClick={handleResendOtp}
              className="font-bold text-violet-700 hover:underline disabled:opacity-50"
            >
              {resending ? (lang === 'en' ? 'Sending…' : 'Kohereza…') : lang === 'en' ? 'Resend code' : 'Ongera wohereze'}
            </button>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#7B3FF2]/20 hover:opacity-95 transition disabled:opacity-60"
          >
            {pending ? (
              lang === 'en' ? 'Activating account…' : 'Gufungura konti…'
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />{' '}
                {lang === 'en' ? 'Complete Claim & Activate' : 'Emeza Byose No Kwinjira'}
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
