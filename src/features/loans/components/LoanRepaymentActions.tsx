'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/formatters'
import { FormError } from '@/components/forms/FormError'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

type Repayment = { id: string; amount: number; principal_amount: number; interest_amount: number; status: 'pending' | 'verified' | 'rejected'; received_at: string; reference: string | null }

export function LoanRepaymentActions({ loanId, currency, canSubmit, canVerify }: { loanId: string; currency: string; canSubmit: boolean; canVerify: boolean }) {
  const [items, setItems] = useState<Repayment[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const reload = useCallback(() => apiRequest<Repayment[]>(`/api/loans/${loanId}/repayments`).then(setItems).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load repayments.')), [loanId])
  useEffect(() => { void reload() }, [reload])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setPending(true); setError('')
    try {
      await apiRequest(`/api/loans/${loanId}/repayments`, { method: 'POST', body: JSON.stringify({ amount: Number(form.get('amount')), payment_method: form.get('payment_method'), reference: form.get('reference') || null }) })
      formElement.reset()
      await reload()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not submit the repayment.') }
    finally { setPending(false) }
  }

  async function review(id: string, status: 'verified' | 'rejected') {
    setPending(true); setError('')
    try { await apiRequest(`/api/loans/${loanId}/repayments`, { method: 'PATCH', body: JSON.stringify({ id, status }) }); await reload() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not review the repayment.') }
    finally { setPending(false) }
  }

  return <div className="min-w-56 space-y-2">
    {canSubmit && <details><summary className="cursor-pointer text-xs font-semibold text-indigo-700">Record repayment</summary><form onSubmit={submit} className="mt-2 grid gap-2 rounded border border-slate-200 bg-white p-3"><FormError message={error} /><label className="grid gap-1 text-xs text-slate-600">Amount ({currency})<Input name="amount" type="number" min="1" step="1" required /></label><label className="grid gap-1 text-xs text-slate-600">Payment method<Select name="payment_method"><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile money</option><option value="other">Other</option></Select></label><label className="grid gap-1 text-xs text-slate-600">Reference<Input name="reference" maxLength={160} /></label><FormSubmit pending={pending}>Submit payment</FormSubmit></form></details>}
    {items.filter((item) => item.status === 'pending').map((item) => <div key={item.id} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs"><p>{formatMoney(item.amount, currency)} awaiting verification</p><p className="text-slate-500">Interest {formatMoney(item.interest_amount, currency)} · Principal {formatMoney(item.principal_amount, currency)} · {formatDate(item.received_at)}</p>{canVerify && <div className="mt-2 flex gap-2"><button type="button" disabled={pending} onClick={() => void review(item.id, 'verified')} className="rounded bg-indigo-700 px-2 py-1 font-semibold text-white">Verify</button><button type="button" disabled={pending} onClick={() => void review(item.id, 'rejected')} className="rounded border border-slate-300 bg-white px-2 py-1">Reject</button></div>}</div>)}
    {error && !canSubmit && <FormError message={error} />}
  </div>
}
