'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { apiRequest } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/formatters'
import type { Loan } from '@/types/loan'

type LoanRepayment = {
  id: string
  amount: number
  principal_amount: number
  interest_amount: number
  status: 'pending' | 'verified' | 'rejected'
  received_at: string
  reference: string | null
}

type LoanActionsDialogProps = {
  loan: Loan
  memberName: string
  currency: string
  open: boolean
  isOwn: boolean
  canApprove: boolean
  canDisburse: boolean
  canManage: boolean
  canRecordRepayments: boolean
  canVerifyRepayments: boolean
  onClose: () => void
  onChanged: () => void
}

function defaultDueDate(termMonths: number) {
  const date = new Date()
  date.setDate(date.getDate() + termMonths * 30)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function LoanActionsDialog({
  loan,
  memberName,
  currency,
  open,
  isOwn,
  canApprove,
  canDisburse,
  canManage,
  canRecordRepayments,
  canVerifyRepayments,
  onClose,
  onChanged,
}: LoanActionsDialogProps) {
  const [repaymentState, setRepaymentState] = useState<{
    loanId: string
    repayments: LoanRepayment[]
  } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const repayments =
    open &&
    canVerifyRepayments &&
    ['active', 'defaulted'].includes(loan.status) &&
    repaymentState?.loanId === loan.id
      ? repaymentState.repayments
      : []

  useEffect(() => {
    if (!open || !canVerifyRepayments || !['active', 'defaulted'].includes(loan.status)) return
    let active = true
    apiRequest<LoanRepayment[]>(`/api/loans/${loan.id}/repayments`)
      .then((items) => {
        if (active)
          setRepaymentState({
            loanId: loan.id,
            repayments: items.filter((item) => item.status === 'pending'),
          })
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Could not load repayment requests.')
      })
    return () => {
      active = false
    }
  }, [open, canVerifyRepayments, loan.id, loan.status])

  async function saveAction(action: () => Promise<unknown>, close = true) {
    setPending(true)
    setError('')
    try {
      await action()
      onChanged()
      if (close) onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this loan.')
    } finally {
      setPending(false)
    }
  }

  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const nextStatus = submitter?.value
    if (nextStatus !== 'approved' && nextStatus !== 'rejected') return
    const note = rejectionReason.trim()
    if (nextStatus === 'rejected' && note.length < 3) {
      setError('Add a short reason before rejecting this request.')
      return
    }
    await saveAction(() =>
      apiRequest('/api/loans', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'decision',
          id: loan.id,
          status: nextStatus,
          rejection_reason: nextStatus === 'rejected' ? note : null,
        }),
      }),
    )
  }

  async function disburse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await saveAction(() =>
      apiRequest('/api/loans', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'decision',
          id: loan.id,
          status: 'active',
          due_date: form.get('due_date'),
          disbursement_reference: form.get('reference') || null,
        }),
      }),
    )
  }

  async function recordRepayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await saveAction(() =>
      apiRequest(`/api/loans/${loan.id}/repayments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.get('amount')),
          payment_method: form.get('payment_method'),
          reference: form.get('reference') || null,
        }),
      }),
    )
  }

  async function extendLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await saveAction(() =>
      apiRequest('/api/loans', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'extend',
          id: loan.id,
          due_date: form.get('due_date'),
        }),
      }),
    )
  }

  async function cancelApprovedLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await saveAction(() =>
      apiRequest('/api/loans', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'cancel_approved',
          id: loan.id,
          reason: form.get('reason') || null,
        }),
      }),
    )
  }

  async function updateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await saveAction(() =>
      apiRequest('/api/loans', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'update_draft',
          id: loan.id,
          principal: Number(form.get('principal')),
          term_months: Number(form.get('term_months')),
          purpose: form.get('purpose'),
        }),
      }),
    )
  }

  function submitDraft() {
    void saveAction(() =>
      apiRequest('/api/loans', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'submit_draft', id: loan.id }),
      }),
    )
  }

  function reviewRepayment(id: string, status: 'verified' | 'rejected') {
    void saveAction(async () => {
      await apiRequest(`/api/loans/${loan.id}/repayments`, {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      })
      const items = await apiRequest<LoanRepayment[]>(`/api/loans/${loan.id}/repayments`)
      setRepaymentState({
        loanId: loan.id,
        repayments: items.filter((item) => item.status === 'pending'),
      })
    }, false)
  }

  const hasActions =
    (loan.status === 'pending' && (loan.is_draft ? isOwn : canApprove)) ||
    (loan.status === 'approved' && (canDisburse || isOwn)) ||
    (['active', 'defaulted'].includes(loan.status) &&
      (isOwn ||
        canRecordRepayments ||
        canVerifyRepayments ||
        (loan.status === 'active' && canManage)))

  return (
    <Modal open={open} title="Loan actions" onClose={onClose}>
      <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-indigo-100/80 bg-indigo-50/50 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-[#081233]">{memberName}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{loan.purpose}</p>
        </div>
        <span className="shrink-0 rounded-full border border-indigo-100 bg-white px-2.5 py-1 text-[10px] font-bold capitalize text-[#5A36E8]">
          {loan.is_draft ? 'draft' : loan.status}
        </span>
      </div>

      <FormError message={error} />
      {!hasActions && (
        <p className="rounded-2xl border border-indigo-100 bg-white/80 p-4 text-sm leading-relaxed text-slate-500">
          There are no actions available for this loan with your current group permissions.
        </p>
      )}

      {loan.status === 'pending' && loan.is_draft && isOwn && (
        <div className="grid gap-4">
          <p className="text-sm leading-relaxed text-slate-600">
            This application is saved privately as a draft. Update its terms, then submit it for
            group review.
          </p>
          <form onSubmit={updateDraft} className="grid gap-4">
            <FormField
              htmlFor={`draft-principal-${loan.id}`}
              label={`Amount requested (${currency})`}
            >
              <Input
                id={`draft-principal-${loan.id}`}
                name="principal"
                type="number"
                min="1"
                step="1"
                defaultValue={loan.principal}
                required
              />
            </FormField>
            <p className="text-xs leading-relaxed text-slate-500">
              The monthly interest rate is determined automatically by the cycle from the term and
              remains based on the original principal. Current rate: {loan.interest_rate}%.
            </p>
            <FormField htmlFor={`draft-term-${loan.id}`} label="Term (months)">
              <Input
                id={`draft-term-${loan.id}`}
                name="term_months"
                type="number"
                min="1"
                max="120"
                defaultValue={loan.term_months}
                required
              />
            </FormField>
            <FormField htmlFor={`draft-purpose-${loan.id}`} label="Purpose">
              <Textarea
                id={`draft-purpose-${loan.id}`}
                name="purpose"
                minLength={5}
                maxLength={1000}
                defaultValue={loan.purpose}
                required
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <FormSubmit pending={pending}>Save draft changes</FormSubmit>
              <button
                type="button"
                disabled={pending}
                onClick={submitDraft}
                className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold text-[#4d42cf] transition hover:bg-indigo-50 disabled:opacity-50"
              >
                Submit for review
              </button>
            </div>
          </form>
        </div>
      )}

      {loan.status === 'pending' && !loan.is_draft && canApprove && (
        <form onSubmit={decide} className="grid gap-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Approve the request for committee review, or reject it with a reason the borrower can
            understand.
          </p>
          <FormField
            htmlFor={`loan-rejection-${loan.id}`}
            label="Rejection reason (required when rejecting)"
          >
            <Textarea
              id={`loan-rejection-${loan.id}`}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              maxLength={2000}
              placeholder="Explain why this application cannot be approved."
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="decision"
              value="approved"
              disabled={pending}
              className="rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
            >
              Approve request
            </button>
            <button
              type="submit"
              name="decision"
              value="rejected"
              disabled={pending}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-50"
            >
              Reject request
            </button>
          </div>
        </form>
      )}

      {loan.status === 'approved' && canDisburse && (
        <form onSubmit={disburse} className="grid gap-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Confirm the due date and record the cash, bank, or mobile-money reference when the funds
            are issued.
          </p>
          <FormField htmlFor={`loan-due-${loan.id}`} label="Due date">
            <Input
              id={`loan-due-${loan.id}`}
              name="due_date"
              type="date"
              defaultValue={defaultDueDate(loan.term_months)}
              required
            />
          </FormField>
          <FormField htmlFor={`loan-reference-${loan.id}`} label="Disbursement reference">
            <Input id={`loan-reference-${loan.id}`} name="reference" maxLength={160} />
          </FormField>
          <FormSubmit pending={pending}>Confirm disbursement</FormSubmit>
        </form>
      )}

      {loan.status === 'approved' && isOwn && (
        <form
          onSubmit={cancelApprovedLoan}
          className="mt-5 grid gap-3 border-t border-indigo-50 pt-5"
        >
          <FormField htmlFor={`loan-cancel-note-${loan.id}`} label="Cancellation note (optional)">
            <Input id={`loan-cancel-note-${loan.id}`} name="reason" maxLength={2000} />
          </FormField>
          <button
            type="submit"
            disabled={pending}
            className="justify-self-start rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            Cancel before disbursement
          </button>
        </form>
      )}

      {['active', 'defaulted'].includes(loan.status) && (isOwn || canRecordRepayments) && (
        <form onSubmit={recordRepayment} className="grid gap-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs leading-relaxed text-slate-600">
            Outstanding:{' '}
            <strong className="text-[#081233]">
              {formatMoney(loan.outstanding_amount + loan.outstanding_interest, currency)}
            </strong>
            {' · '}Interest is covered before principal.
          </div>
          <FormField htmlFor={`loan-payment-${loan.id}`} label={`Payment amount (${currency})`}>
            <Input
              id={`loan-payment-${loan.id}`}
              name="amount"
              type="number"
              min="1"
              max={loan.outstanding_amount + loan.outstanding_interest}
              step="1"
              required
            />
          </FormField>
          <FormField htmlFor={`loan-method-${loan.id}`} label="Payment method">
            <Select id={`loan-method-${loan.id}`} name="payment_method" defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="mobile_money">Mobile money</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
          <FormField htmlFor={`loan-payment-reference-${loan.id}`} label="Payment reference">
            <Input id={`loan-payment-reference-${loan.id}`} name="reference" maxLength={160} />
          </FormField>
          <FormSubmit pending={pending}>Record repayment</FormSubmit>
        </form>
      )}

      {canVerifyRepayments && repayments.length > 0 && (
        <section className="mt-5 space-y-3 border-t border-indigo-50 pt-5">
          <div>
            <h3 className="font-heading text-sm font-extrabold text-[#081233]">
              Repayments awaiting review
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Verify or reject borrower-submitted payments.
            </p>
          </div>
          {repayments.map((repayment) => (
            <article
              key={repayment.id}
              className="rounded-2xl border border-amber-100 bg-amber-50/65 p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-[#081233]">
                    {formatMoney(repayment.amount, currency)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Interest {formatMoney(repayment.interest_amount, currency)} · Principal{' '}
                    {formatMoney(repayment.principal_amount, currency)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Received {formatDate(repayment.received_at)}
                    {repayment.reference ? ` · Ref ${repayment.reference}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => reviewRepayment(repayment.id, 'verified')}
                  className="rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  Verify payment
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => reviewRepayment(repayment.id, 'rejected')}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {loan.status === 'active' && canManage && (
        <form onSubmit={extendLoan} className="mt-5 grid gap-3 border-t border-indigo-50 pt-5">
          <h3 className="font-heading text-sm font-extrabold text-[#081233]">Extend due date</h3>
          <FormField htmlFor={`loan-extension-${loan.id}`} label="New due date">
            <Input
              id={`loan-extension-${loan.id}`}
              name="due_date"
              type="date"
              min={loan.due_date ?? undefined}
              defaultValue={loan.due_date ?? ''}
              required
            />
          </FormField>
          <button
            type="submit"
            disabled={pending}
            className="justify-self-start rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-xs font-bold text-[#4d42cf] transition hover:bg-indigo-50 disabled:opacity-50"
          >
            Save extension
          </button>
        </form>
      )}
    </Modal>
  )
}
