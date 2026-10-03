'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api'
import { FormError } from '@/components/forms/FormError'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

export function LoanDraftActions({ loan }: { loan: { id: string; principal: number; interest_rate: number; term_months: number; purpose: string } }) {
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true); setError('')
    try {
      await apiRequest('/api/loans', { method: 'PATCH', body: JSON.stringify({ action: 'update_draft', id: loan.id, principal: Number(form.get('principal')), interest_rate: Number(form.get('interest_rate')), term_months: Number(form.get('term_months')), purpose: form.get('purpose') }) })
      setEditing(false); router.refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this draft.') }
    finally { setPending(false) }
  }

  async function submitDraft() {
    setPending(true); setError('')
    try { await apiRequest('/api/loans', { method: 'PATCH', body: JSON.stringify({ action: 'submit_draft', id: loan.id }) }); router.refresh() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not submit this draft.') }
    finally { setPending(false) }
  }

  return <div className="space-y-2"><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => setEditing((value) => !value)} className="rounded border px-2 py-1 text-xs">{editing ? 'Close edit' : 'Edit draft'}</button><button type="button" disabled={pending} onClick={() => void submitDraft()} className="rounded bg-indigo-700 px-2 py-1 text-xs font-semibold text-white">Submit</button></div>{editing && <form onSubmit={save} className="grid min-w-60 gap-2 rounded border border-slate-200 bg-white p-3"><FormError message={error} /><label className="grid gap-1 text-xs text-slate-600">Amount<Input name="principal" type="number" min="1" step="1" defaultValue={loan.principal} required /></label><label className="grid gap-1 text-xs text-slate-600">Interest rate (%)<Input name="interest_rate" type="number" min="0" max="100" step="0.01" defaultValue={loan.interest_rate} required /></label><label className="grid gap-1 text-xs text-slate-600">Term (months)<Input name="term_months" type="number" min="1" max="120" defaultValue={loan.term_months} required /></label><label className="grid gap-1 text-xs text-slate-600">Purpose<Textarea name="purpose" minLength={5} maxLength={1000} defaultValue={loan.purpose} required /></label><FormSubmit pending={pending}>Save draft</FormSubmit></form>}{error && !editing && <FormError message={error} />}</div>
}
