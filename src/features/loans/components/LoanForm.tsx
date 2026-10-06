'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { loanService } from '@/features/loans/services/loan.service'
import { loanCreateSchema } from '@/features/loans/schemas/loan.schema'
import { apiRequest } from '@/lib/api'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { Loan } from '@/types/loan'

type CycleStatus = 'checking' | 'open' | 'closed' | 'unavailable'
type CycleCheck = {
  groupId: string
  status: CycleStatus
  interestRates?: { upToFourMonths: number; overFourMonths: number }
}

export function LoanForm({
  groupId,
  memberId,
  currency = 'RWF',
  onCreated,
}: {
  groupId: string
  memberId: string
  currency?: string
  onCreated?: (loan: Loan) => void
}) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)
  const [cycleCheck, setCycleCheck] = useState<CycleCheck | null>(null)
  const [cycleRetry, setCycleRetry] = useState(0)
  const [termMonths, setTermMonths] = useState(1)
  const cycleStatus = cycleCheck?.groupId === groupId ? cycleCheck.status : 'checking'
  const interestRate =
    termMonths <= 4
      ? (cycleCheck?.interestRates?.upToFourMonths ?? 3)
      : (cycleCheck?.interestRates?.overFourMonths ?? 5)

  useEffect(() => {
    let active = true
    apiRequest<{
      id: string
      interest_rates: { up_to_4_months: number; over_4_months: number }
    } | null>(`/api/cycles/active?group_id=${encodeURIComponent(groupId)}`)
      .then((cycle) => {
        if (active)
          setCycleCheck({
            groupId,
            status: cycle ? 'open' : 'closed',
            interestRates: cycle
              ? {
                  upToFourMonths: cycle.interest_rates.up_to_4_months,
                  overFourMonths: cycle.interest_rates.over_4_months,
                }
              : undefined,
          })
      })
      .catch(() => {
        if (active) setCycleCheck({ groupId, status: 'unavailable' })
      })
    return () => {
      active = false
    }
  }, [groupId, cycleRetry])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (cycleStatus !== 'open') return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const isDraft = submitter?.value === 'draft'
    const parsed = loanCreateSchema.safeParse({
      group_id: groupId,
      member_id: memberId,
      principal: Number(form.get('principal')),
      term_months: Number(form.get('term_months')),
      purpose: form.get('purpose'),
      is_draft: isDraft,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check application details.')
      return
    }
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const loan = await loanService.apply(parsed.data)
      onCreated?.(loan)
      formElement.reset()
      setSuccess(
        isDraft
          ? 'Loan request saved as a draft. You can edit and submit it from Loans.'
          : 'Loan request submitted for committee review.',
      )
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit the application.')
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      {cycleStatus !== 'open' && (
        <div
          role={cycleStatus === 'unavailable' ? 'alert' : 'status'}
          className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-950"
        >
          {cycleStatus === 'checking' && 'Checking whether this Ikimina has an active cycle…'}
          {cycleStatus === 'closed' &&
            'Loan applications are paused because this Ikimina has no active cycle. Ask an authorized official to open a cycle.'}
          {cycleStatus === 'unavailable' && (
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Could not check the Ikimina cycle. Try again before submitting a loan request.
              </span>
              <button
                type="button"
                onClick={() => {
                  setCycleCheck(null)
                  setCycleRetry((attempt) => attempt + 1)
                }}
                className="font-bold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
              >
                Retry
              </button>
            </span>
          )}
        </div>
      )}
      <FormError message={error} />
      {success && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm font-medium text-emerald-800"
        >
          {success}
        </p>
      )}
      <FormField htmlFor="loan-principal" label={`Amount requested (${currency})`}>
        <Input id="loan-principal" name="principal" type="number" min="1" step="1" required />
      </FormField>
      <FormField htmlFor="loan-term" label="Term (months)">
        <Input
          id="loan-term"
          name="term_months"
          type="number"
          min="1"
          max="120"
          value={termMonths}
          onChange={(event) => setTermMonths(Number(event.target.value))}
          required
        />
      </FormField>
      <p className="-mt-2 text-xs leading-relaxed text-slate-500">
        Cycle interest: {interestRate}% per month on the original principal
        {termMonths <= 4 ? ' for terms up to 4 months.' : ' for terms over 4 months.'} The cycle
        applies this rate automatically.
      </p>
      <FormField htmlFor="loan-purpose" label="Purpose">
        <Textarea id="loan-purpose" name="purpose" minLength={5} maxLength={1000} required />
      </FormField>
      <div className="flex flex-wrap gap-3">
        <button
          name="intent"
          value="draft"
          type="submit"
          disabled={pending || cycleStatus !== 'open'}
          className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold text-[#4d42cf] transition hover:bg-indigo-50 disabled:opacity-50"
        >
          Save as draft
        </button>
        <FormSubmit
          name="intent"
          value="submit"
          pending={pending}
          disabled={cycleStatus !== 'open'}
        >
          Submit application
        </FormSubmit>
      </div>
    </form>
  )
}
