'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, CircleDollarSign, ClipboardList, Coins, LoaderCircle, ShieldCheck } from 'lucide-react'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ApiError, apiRequest } from '@/lib/api'
import { formatMoney } from '@/lib/formatters'
import type { OnboardingStep } from '@/features/membership/lib/onboarding-state'

type GroupInfo = {
  id: string
  name: string
  description: string | null
  location: string | null
  currency: string
  contribution_amount: number
  contribution_frequency: string
}
type CycleInfo = {
  id: string
  name: string
  starts_on: string
  ends_on: string
  share_price: number
  contribution_amount: number
  contribution_due_day: number
  rules: Record<string, unknown>
} | null
type MemberField = {
  id: string
  label: string
  description: string
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'phone' | 'select' | 'radio' | 'checkbox'
  is_required: boolean
  options: string[]
}
type Snapshot = {
  group: GroupInfo
  cycle: CycleInfo
  terms: { version: number; title: string; body: string; is_required: boolean } | null
  fields: MemberField[]
  state: {
    terms_completed_version: number | null
    accepted_terms_version: number | null
    field_responses: Record<string, unknown>
    selected_share_units: number | null
    contribution_acknowledged_at: string | null
  } | null
  step: OnboardingStep | null
  complete: boolean
}

const labels: Record<Exclude<OnboardingStep, 'complete'>, string> = {
  group_information: 'About your Ikimina',
  rules: 'Rules and requirements',
  member_information: 'Your information',
  shares: 'Shares',
  contributions: 'Contributions',
}

export function MemberOnboarding({ groupId }: { groupId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [shareUnits, setShareUnits] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const requestVersion = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestVersion.current
    try {
      const result = await apiRequest<Snapshot>(`/api/member/onboarding?group_id=${encodeURIComponent(groupId)}`)
      if (requestVersion.current !== requestId) return
      setSnapshot(result)
      setAnswers(result.state?.field_responses ?? {})
      setShareUnits(result.state?.selected_share_units == null ? '' : String(result.state.selected_share_units))
      setAccepted(result.state?.accepted_terms_version === result.terms?.version)
      setAcknowledged(Boolean(result.state?.contribution_acknowledged_at))
      setError('')
    } catch (cause) {
      if (requestVersion.current !== requestId) return
      setError(cause instanceof Error ? cause.message : 'Group onboarding could not be loaded.')
    }
  }, [groupId])

  useEffect(() => {
    let active = true
    void apiRequest<Snapshot>(`/api/member/onboarding?group_id=${encodeURIComponent(groupId)}`)
      .then((result) => {
        if (!active) return
        setSnapshot(result)
        setAnswers(result.state?.field_responses ?? {})
        setShareUnits(result.state?.selected_share_units == null ? '' : String(result.state.selected_share_units))
        setAccepted(result.state?.accepted_terms_version === result.terms?.version)
        setAcknowledged(Boolean(result.state?.contribution_acknowledged_at))
        setError('')
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Group onboarding could not be loaded.')
      })
    return () => { active = false }
  }, [groupId])

  async function saveStep(step: OnboardingStep, payload: Record<string, unknown> = {}) {
    setSaving(true)
    setError('')
    try {
      await apiRequest('/api/member/onboarding', {
        method: 'POST',
        body: JSON.stringify({ group_id: groupId, step, payload }),
      })
      await load()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'This onboarding step could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function submitFields(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!snapshot) return
    const values: Record<string, unknown> = {}
    for (const field of snapshot.fields) {
      const value = answers[field.id]
      if (field.is_required && (value === undefined || value === null || value === '' || (field.field_type === 'checkbox' && value !== true))) {
        setError(`${field.label} is required.`)
        return
      }
      values[field.id] = value ?? null
    }
    await saveStep('member_information', { values })
  }

  const step = snapshot?.step ?? null
  const shareConfig = snapshot?.cycle?.rules.member_share_selection as { enabled?: boolean; min_units?: number; max_units?: number | null; required_units?: number } | undefined
  const contributionAmount = Number(snapshot?.cycle?.contribution_amount ?? snapshot?.group.contribution_amount ?? 0)
  const socialContribution = Number(snapshot?.cycle?.rules.social_contribution_amount ?? 0)
  const totalContribution = contributionAmount + socialContribution
  const renderedStep = useMemo(() => {
    if (!step || step === 'complete') return null
    return labels[step]
  }, [step])

  const loading = snapshot?.group.id !== groupId && !error
  if (loading) return <main className="mx-auto grid min-h-[55vh] max-w-3xl place-items-center p-5"><p role="status" className="inline-flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your group onboarding…</p></main>
  if (error && !snapshot) return <main className="mx-auto max-w-3xl p-5 sm:p-8"><section className="rounded-2xl border border-white bg-white p-6 shadow-sm"><FormError message={error} /><button type="button" onClick={() => void load()} className="mt-4 rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white">Try again</button></section></main>
  if (!snapshot) return null

  const group = snapshot.group
  const currentIndex = step && step !== 'complete' ? Object.keys(labels).indexOf(step) : Object.keys(labels).length
  const completed = snapshot.complete || step === null

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-7 lg:p-9">
      <header className="rounded-3xl border border-violet-100 bg-white/95 p-5 shadow-[0_22px_70px_-52px_rgba(60,36,120,.5)] sm:p-8">
        <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-violet-700"><ShieldCheck className="h-4 w-4" />Member onboarding</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-[#17102f] sm:text-3xl">Welcome to {group.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">We’ll walk through this Ikimina’s information and requirements before opening your personal Member space. Your progress is saved to this membership.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-5" aria-label="Onboarding progress">
          {Object.entries(labels).map(([key, label], index) => {
            const done = completed || index < currentIndex
            const active = !completed && key === step
            return <div key={key} className={`rounded-xl border px-3 py-2.5 ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : active ? 'border-violet-300 bg-violet-50 text-violet-900' : 'border-slate-100 bg-slate-50 text-slate-400'}`}><span className="flex items-center gap-1.5 text-[10px] font-bold"><span className="grid h-4 w-4 place-items-center rounded-full bg-white/80">{done ? <Check className="h-3 w-3" /> : index + 1}</span>{label}</span></div>
          })}
        </div>
      </header>

      {error && <FormError message={error} />}

      {completed ? (
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><BadgeCheck className="h-7 w-7" /></div>
          <h2 className="mt-4 font-heading text-xl font-extrabold text-[#17102f]">Your Member space is ready</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">You’ve completed the setup for {group.name}. You can now view your own contributions, shares, payments, loans, and statements.</p>
          <Link href={`/dashboard?group=${encodeURIComponent(groupId)}`} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800">Open Member dashboard <ArrowRight className="h-4 w-4" /></Link>
        </section>
      ) : step === 'group_information' ? (
        <section className="space-y-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Building2 className="h-5 w-5" /></div><div><h2 className="font-heading text-lg font-extrabold text-[#17102f]">About this Ikimina</h2><p className="mt-1 text-xs text-slate-500">Review the group context before continuing.</p></div></div>
          <dl className="grid gap-3 sm:grid-cols-2"><Info label="Group" value={group.name} />{group.location && <Info label="Community or location" value={group.location} />}<Info label="Contribution frequency" value={group.contribution_frequency} /><Info label="Group currency" value={group.currency} />{snapshot.cycle && <Info label="Current cycle" value={`${snapshot.cycle.name} · ${snapshot.cycle.starts_on} to ${snapshot.cycle.ends_on}`} />}</dl>
          {group.description && <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{group.description}</p>}
          <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void saveStep('group_information')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Continue'} <ArrowRight className="h-4 w-4" /></button></div>
        </section>
      ) : step === 'rules' && snapshot.terms ? (
        <section className="space-y-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><ClipboardList className="h-5 w-5" /></div><div><h2 className="font-heading text-lg font-extrabold text-[#17102f]">{snapshot.terms.title}</h2><p className="mt-1 text-xs text-slate-500">Current group requirements · version {snapshot.terms.version}</p></div></div>
          <div className="max-h-[48vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700">{snapshot.terms.body}</div>
          <label className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-sm text-slate-700"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 accent-violet-700" /><span>I have read and understand these group requirements{snapshot.terms.is_required ? ' and accept them' : ' (acceptance is optional)'}.</span></label>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={saving || (snapshot.terms.is_required && !accepted)} onClick={() => void saveStep('rules', { accepted })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : accepted ? 'Accept and continue' : 'Continue without acceptance'} <ArrowRight className="h-4 w-4" /></button></div>
        </section>
      ) : step === 'member_information' ? (
        <form onSubmit={(event) => void submitFields(event)} className="space-y-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-8">
          <div><h2 className="font-heading text-lg font-extrabold text-[#17102f]">Your group information</h2><p className="mt-1 text-xs text-slate-500">This information is attached to your membership in {group.name}.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">{snapshot.fields.map((field) => <DynamicField key={field.id} field={field} value={answers[field.id]} onChange={(value) => setAnswers((current) => ({ ...current, [field.id]: value }))} />)}</div>
          <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save and continue'} <ArrowRight className="h-4 w-4" /></button></div>
        </form>
      ) : step === 'shares' ? (
        <section className="space-y-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Coins className="h-5 w-5" /></div><div><h2 className="font-heading text-lg font-extrabold text-[#17102f]">Choose your shares</h2><p className="mt-1 text-xs text-slate-500">This request will be marked pending until an authorized official verifies it.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-3"><Info label="Price per share" value={formatMoney(snapshot.cycle?.share_price ?? 0, group.currency)} />{shareConfig?.min_units != null && <Info label="Minimum units" value={String(shareConfig.min_units)} />}{shareConfig?.max_units != null && <Info label="Maximum units" value={String(shareConfig.max_units)} />}</div>
          <FormField htmlFor="onboarding-share-units" label="Number of shares" hint="Submitting this selection does not record a payment."><Input id="onboarding-share-units" type="number" min={shareConfig?.min_units ?? 1} max={shareConfig?.max_units ?? undefined} step="0.01" value={shareUnits} onChange={(event) => setShareUnits(event.target.value)} required /></FormField>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">Your selection creates a pending share request. It is not a receipt and does not mean money has been received by the group.</div>
          <div className="flex justify-end"><button type="button" disabled={saving || !shareUnits} onClick={() => void saveStep('shares', { units: Number(shareUnits) })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Submit share selection'} <ArrowRight className="h-4 w-4" /></button></div>
        </section>
      ) : step === 'contributions' ? (
        <section className="space-y-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><CircleDollarSign className="h-5 w-5" /></div><div><h2 className="font-heading text-lg font-extrabold text-[#17102f]">Understand your contributions</h2><p className="mt-1 text-xs text-slate-500">Your group sets the expected payment. This confirmation records understanding only, not payment.</p></div></div>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100"><AmountRow label="Savings / shares contribution" amount={contributionAmount} currency={group.currency} /><AmountRow label="Social contribution" amount={socialContribution} currency={group.currency} note="Included as a separate component of the monthly obligation." /><AmountRow label="Total expected per period" amount={totalContribution} currency={group.currency} strong /></div>
          {snapshot.cycle && <p className="text-xs text-slate-500">Current cycle: {snapshot.cycle.name} · Contribution due day {snapshot.cycle.contribution_due_day}.</p>}
          <label className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-sm text-slate-700"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5 accent-violet-700" /><span>I understand the contribution amounts shown above and that confirming here does not submit or verify a payment.</span></label>
          <div className="flex justify-end"><button type="button" disabled={saving || !acknowledged} onClick={() => void saveStep('contributions', { acknowledged })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Confirm and continue'} <ArrowRight className="h-4 w-4" /></button></div>
        </section>
      ) : (
        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-8"><h2 className="font-heading text-lg font-extrabold text-[#17102f]">Finish setup</h2><p className="mt-2 text-sm text-slate-600">Your onboarding details are ready. Finish to open your Member dashboard.</p><div className="mt-5 flex justify-between"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 text-sm font-bold text-violet-700"><ArrowLeft className="h-4 w-4" />Refresh progress</button><button type="button" disabled={saving} onClick={() => void saveStep('complete')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Finishing…' : 'Finish onboarding'} <Check className="h-4 w-4" /></button></div></section>
      )}
      {!completed && renderedStep && <p className="text-center text-[11px] text-slate-500">Your progress is saved to your membership in {group.name}. You can safely return later.</p>}
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 p-3"><dt className="text-[9px] font-bold uppercase tracking-[.13em] text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-semibold capitalize text-slate-800">{value}</dd></div>
}

function AmountRow({ label, amount, currency, note, strong = false }: { label: string; amount: number; currency: string; note?: string; strong?: boolean }) {
  return <div className={`flex items-start justify-between gap-4 px-4 py-3 ${strong ? 'bg-violet-50/70' : ''}`}><div><p className={`text-sm ${strong ? 'font-extrabold text-violet-950' : 'font-medium text-slate-700'}`}>{label}</p>{note && <p className="mt-1 text-[10px] text-slate-500">{note}</p>}</div><p className={`shrink-0 text-sm tabular-nums ${strong ? 'font-extrabold text-violet-900' : 'font-bold text-slate-800'}`}>{formatMoney(amount, currency)}</p></div>
}

function DynamicField({ field, value, onChange }: { field: MemberField; value: unknown; onChange: (value: unknown) => void }) {
  const id = `onboarding-field-${field.id}`
  if (field.field_type === 'checkbox') return <label htmlFor={id} className="flex items-start gap-2.5 rounded-xl border border-slate-100 p-3 text-sm text-slate-700"><input id={id} type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 accent-violet-700" />{field.label}{field.is_required && <span className="text-rose-600" aria-hidden="true">*</span>}{field.description && <span className="sr-only">{field.description}</span>}</label>
  if (field.field_type === 'radio') return <fieldset className="grid gap-2 sm:col-span-2"><legend className="mb-1 text-xs font-semibold text-slate-700">{field.label}{field.is_required && <span className="ml-1 text-rose-600">*</span>}</legend>{field.description && <p className="text-[11px] text-slate-500">{field.description}</p>}{field.options.map((option) => <label key={option} className="flex items-center gap-2 text-sm text-slate-700"><input type="radio" name={id} value={option} checked={value === option} onChange={() => onChange(option)} className="accent-violet-700" />{option}</label>)}</fieldset>
  return <FormField htmlFor={id} label={`${field.label}${field.is_required ? ' *' : ''}`} hint={field.description}>
    {field.field_type === 'textarea' ? <Textarea id={id} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} required={field.is_required} maxLength={12000} rows={3} />
      : field.field_type === 'select' ? <Select id={id} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} required={field.is_required}><option value="">Choose…</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</Select>
        : <Input id={id} type={field.field_type === 'phone' ? 'tel' : field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'} value={String(value ?? '')} onChange={(event) => onChange(field.field_type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} required={field.is_required} maxLength={field.field_type === 'text' ? 2000 : undefined} step={field.field_type === 'number' ? '0.0001' : undefined} />}
  </FormField>
}
