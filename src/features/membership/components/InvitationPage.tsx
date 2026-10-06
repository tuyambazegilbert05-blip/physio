'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Clock3, Mail, ShieldCheck, UserPlus, X } from 'lucide-react'
import { registerSchema } from '@/features/auth/schemas/auth.schema'
import { PasswordPolicyFields } from '@/features/auth/components/PasswordPolicyFields'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { ApiError, apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { persistActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'

type Invitation = {
  id?: string
  status: 'pending' | 'sent' | 'delivery_failed' | 'accepted' | 'declined' | 'expired' | 'revoked' | 'unavailable' | 'invalid'
  email?: string
  invitee_name?: string | null
  expires_at?: string
  group_id?: string
  group_name?: string | null
  inviter_name?: string | null
  group_available?: boolean
}

const activeStates = new Set(['pending', 'sent', 'delivery_failed'])

export function InvitationPage({ token, declineRequested }: { token: string; declineRequested: boolean }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const hasSession = Boolean(user)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<'accept' | 'decline' | 'register' | ''>('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const loginHref = useMemo(() => `/login?next=${encodeURIComponent(`/invitation/${token}`)}`, [token])

  useEffect(() => {
    let active = true
    apiRequest<Invitation>('/api/invitations/status', {
      method: 'POST',
      body: JSON.stringify({ token }),
      referrerPolicy: 'no-referrer',
    })
      .then((result) => {
        if (active) {
          setInvitation(result)
          setEmail(result.email ?? '')
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Invitation status is unavailable.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  async function acceptInvitation() {
    setBusy('accept'); setError(''); setNotice('')
    try {
      const result = await apiRequest<{ status: string; group_id: string }>('/api/invitations/accept', {
        method: 'POST', body: JSON.stringify({ token }), referrerPolicy: 'no-referrer',
      })
      persistActiveGroup(result.group_id)
      router.replace(`/dashboard/onboarding?group=${encodeURIComponent(result.group_id)}`)
      router.refresh()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        router.replace(loginHref)
        return
      }
      setError(cause instanceof Error ? cause.message : 'This invitation could not be accepted.')
      if (cause instanceof ApiError && cause.status === 409) {
        void apiRequest<Invitation>('/api/invitations/status', { method: 'POST', body: JSON.stringify({ token }), referrerPolicy: 'no-referrer' })
          .then((latest) => { setInvitation(latest); setError('') }).catch(() => undefined)
      }
    } finally { setBusy('') }
  }

  async function declineInvitation() {
    setBusy('decline'); setError(''); setNotice('')
    try {
      const result = await apiRequest<{ status: string }>('/api/invitations/decline', {
        method: 'POST', body: JSON.stringify({ token }), referrerPolicy: 'no-referrer',
      })
      if (result.status === 'declined') {
        setInvitation((current) => current ? { ...current, status: 'declined' } : current)
      } else {
        setInvitation((current) => current ? { ...current, status: result.status as Invitation['status'] } : current)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The invitation could not be declined.')
    } finally { setBusy('') }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('')
    if (!invitation?.email) return
    const parsed = registerSchema.safeParse({ fullName, email, phone, password })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your account details.'); return }
    if (parsed.data.email !== invitation.email.trim().toLowerCase()) {
      setError('Use the exact email address this invitation was sent to.')
      return
    }
    if (password !== confirmation) { setError('Passwords do not match.'); return }
    setBusy('register')
    try {
      const result = await apiRequest<{ status: string; group_id: string }>('/api/invitations/register', {
        method: 'POST',
        body: JSON.stringify({ token, email: parsed.data.email, fullName: parsed.data.fullName, phone: parsed.data.phone, password: parsed.data.password }),
        referrerPolicy: 'no-referrer',
      })
      persistActiveGroup(result.group_id)
      router.replace(`/dashboard/onboarding?group=${encodeURIComponent(result.group_id)}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The account could not be created.')
    } finally { setBusy('') }
  }

  async function switchAccount() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    window.dispatchEvent(new Event('ikimina:auth-changed'))
    router.replace(loginHref)
  }

  const isActive = Boolean(invitation && activeStates.has(invitation.status) && invitation.group_available)
  const stateCopy: Record<Invitation['status'], { title: string; text: string }> = {
    pending: { title: 'You are invited', text: 'Review the invitation, then accept to activate your membership.' },
    sent: { title: 'You are invited', text: 'Review the invitation, then accept to activate your membership.' },
    delivery_failed: { title: 'Invitation link opened', text: 'The invitation is valid, though its email delivery was not confirmed.' },
    accepted: { title: 'Invitation already accepted', text: 'This invitation has already been used. Sign in to open your Member space.' },
    declined: { title: 'Invitation declined', text: 'You have declined this invitation. It can no longer be accepted.' },
    expired: { title: 'Invitation expired', text: 'Ask the person who invited you to send a new invitation.' },
    revoked: { title: 'Invitation revoked', text: 'This invitation is no longer valid. Contact the inviter if you still want to join.' },
    unavailable: { title: 'Group unavailable', text: 'This Ikimina is not currently accepting invitations.' },
    invalid: { title: 'Invitation unavailable', text: 'This invitation is invalid or no longer available.' },
  }

  return (
    <main className="min-h-screen bg-[#F8FAFF] px-4 py-8 text-[#081233] sm:px-6 sm:py-12" style={{ backgroundImage: 'linear-gradient(to right, rgba(99,102,241,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,.08) 1px, transparent 1px)', backgroundSize: '42px 42px' }}>
      <div className="mx-auto w-full max-w-[620px]">
        <header className="mb-7 flex justify-center"><Link href="/" aria-label="Physio Fund Cycle home"><BrandLogo size={34} wordmarkClassName="font-heading text-xl font-extrabold text-[#081233]" /></Link></header>
        <section className="rounded-[28px] border border-white/90 bg-white/95 p-5 shadow-[0_22px_70px_-38px_rgba(84,39,170,.4)] sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Mail className="h-5 w-5" /></div>
          {loading ? <div className="animate-pulse"><div className="h-6 w-52 rounded bg-slate-100" /><div className="mt-3 h-4 w-full rounded bg-slate-100" /></div> : invitation ? (
            <>
              <div className="flex flex-wrap items-center gap-2"><h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#231044]">{stateCopy[invitation.status].title}</h1>{isActive && <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">Member invitation</span>}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{stateCopy[invitation.status].text}</p>

              <div className="mt-6 grid gap-3 rounded-2xl border border-violet-100 bg-violet-50/45 p-4 sm:grid-cols-2">
                <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Ikimina group</p><p className="mt-1 text-sm font-extrabold text-[#231044]">{invitation.group_name || 'Ikimina group'}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Invited by</p><p className="mt-1 text-sm font-bold text-[#231044]">{invitation.inviter_name || 'Group official'}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Invitation email</p><p className="mt-1 break-all text-sm font-semibold text-[#231044]">{invitation.email || 'Unavailable'}</p></div>
                {invitation.expires_at && isActive && <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Expires</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#231044]"><Clock3 className="h-3.5 w-3.5 text-violet-600" />{formatDate(invitation.expires_at)}</p></div>}
              </div>

              {error && <div className="mt-4"><FormError message={error} /></div>}
              {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-800">{notice}</p>}

              {isActive && <>
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/55 p-4">
                  <p className="flex items-center gap-2 text-xs font-extrabold text-emerald-900"><ShieldCheck className="h-4 w-4" /> What accepting means</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-emerald-900/75">You become a Member of this group and get access to your own membership and financial information. You do not receive Treasurer, Secretary, approval, or administrative privileges.</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" disabled={Boolean(busy)} onClick={() => void acceptInvitation()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#7B3FF2] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgba(123,63,242,.8)] hover:bg-[#6e2be8] disabled:opacity-60">{busy === 'accept' ? 'Accepting…' : 'Accept invitation'} <ArrowRight className="h-4 w-4" /></button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void declineInvitation()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{busy === 'decline' ? 'Declining…' : declineRequested ? 'Confirm decline' : 'Decline invitation'} <X className="h-4 w-4" /></button>
                </div>
                {declineRequested && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">You chose the decline option from the invitation email. Confirm above to notify the inviter and close this invitation.</p>}
                {authLoading ? (
                  <p role="status" className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">Checking your account session…</p>
                ) : hasSession ? (
                  <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs leading-relaxed text-slate-600">You are signed in. Accept above with the account for <strong>{invitation.email}</strong>. If this is a different account, <button type="button" onClick={() => void switchAccount()} className="font-bold text-violet-700 hover:underline">sign out and switch accounts</button>.</p>
                ) : (
                  <>
                    <p className="mt-3 text-center text-xs text-slate-500">Already have a Physio Fund Cycle account? <Link href={loginHref} className="font-bold text-violet-700 hover:underline">Sign in to accept</Link>.</p>
                    <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400"><span className="h-px flex-1 bg-slate-100" />Create an account<span className="h-px flex-1 bg-slate-100" /></div>
                    <form onSubmit={createAccount} className="grid gap-4">
                      <p className="text-xs leading-relaxed text-slate-500">The invitation verifies this email address. Account creation goes straight to membership activation; no extra code or joining request is needed.</p>
                      <FormField htmlFor="invitation-full-name" label="Full name"><Input id="invitation-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required /></FormField>
                      <FormField htmlFor="invitation-email" label="Invited email address" hint="This address is fixed to the invitation."><Input id="invitation-email" type="email" value={email} readOnly aria-readonly="true" className="bg-slate-50 text-slate-600" /></FormField>
                      <FormField htmlFor="invitation-phone" label="Phone number"><Input id="invitation-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="+250 7XX XXX XXX" required /></FormField>
                      <PasswordPolicyFields prefix="invitation" password={password} confirmation={confirmation} onPasswordChange={setPassword} onConfirmationChange={setConfirmation} />
                      <FormSubmit pending={busy === 'register'}><span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4" />Create account and join</span></FormSubmit>
                    </form>
                  </>
                )}
              </>}

              {invitation.status === 'accepted' && <Link href={`/dashboard/onboarding${invitation.group_id ? `?group=${encodeURIComponent(invitation.group_id)}` : ''}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7B3FF2] px-5 py-3 text-sm font-bold text-white">Continue group onboarding <ArrowRight className="h-4 w-4" /></Link>}
              {invitation.status === 'declined' && <p className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600"><Check className="h-4 w-4" />The inviter has been notified of your decision.</p>}
            </>
          ) : (
            <><h1 className="font-heading text-2xl font-extrabold text-[#231044]">Invitation unavailable</h1><p className="mt-2 text-sm text-slate-600">{error || 'This invitation is invalid or no longer available.'}</p></>
          )}
          {invitation && isActive && error.toLowerCase().includes('sign in with the email') && <button type="button" onClick={() => void switchAccount()} className="mt-3 w-full rounded-xl border border-violet-200 px-4 py-2.5 text-xs font-bold text-violet-800 hover:bg-violet-50">Switch to the invited account</button>}
        </section>
        <footer className="mt-5 text-center text-xs text-slate-500">Need help? Contact the person who invited you.</footer>
      </div>
    </main>
  )
}
