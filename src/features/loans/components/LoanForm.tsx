'use client'

import { useState, type FormEvent } from 'react'
import { loanService } from '@/features/loans/services/loan.service'
import { loanCreateSchema } from '@/features/loans/schemas/loan.schema'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { Loan } from '@/types/loan'

export function LoanForm({ groupId, memberId, onCreated }: { groupId: string; memberId: string; onCreated?: (loan: Loan) => void }) {
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement)
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const isDraft = submitter?.value === 'draft'
    const parsed = loanCreateSchema.safeParse({ group_id: groupId, member_id: memberId, principal: Number(form.get('principal')), interest_rate: Number(form.get('interest_rate')), term_months: Number(form.get('term_months')), purpose: form.get('purpose'), is_draft: isDraft })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check application details.'); return }
    setPending(true); setError(''); setSuccess('')
    try { const loan = await loanService.apply(parsed.data); onCreated?.(loan); formElement.reset(); setSuccess(isDraft ? 'Loan request saved as a draft. You can edit and submit it from Loans.' : 'Loan request submitted for committee review.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not submit the application.') }
    finally { setPending(false) }
  }
  return <form onSubmit={submit} className="grid gap-4"><FormError message={error} />{success && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}<FormField htmlFor="loan-principal" label="Amount requested (RWF)"><Input id="loan-principal" name="principal" type="number" min="1" step="1" required /></FormField><FormField htmlFor="loan-rate" label="Requested interest rate (%)"><Input id="loan-rate" name="interest_rate" type="number" min="0" max="100" step="0.01" defaultValue="0" required /></FormField><FormField htmlFor="loan-term" label="Term (months)"><Input id="loan-term" name="term_months" type="number" min="1" max="120" required /></FormField><FormField htmlFor="loan-purpose" label="Purpose"><Textarea id="loan-purpose" name="purpose" minLength={5} required /></FormField><div className="flex flex-wrap gap-3"><button name="intent" value="draft" type="submit" disabled={pending} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Save as draft</button><FormSubmit name="intent" value="submit" pending={pending}>Submit application</FormSubmit></div></form>
}
