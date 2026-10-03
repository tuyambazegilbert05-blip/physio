'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api'

export function LoanDecisionButtons({ loanId, status, canApprove, canDisburse, termMonths = 1, onUpdated }: { loanId: string; status: 'pending' | 'approved'; canApprove: boolean; canDisburse: boolean; termMonths?: number; onUpdated?: (status: 'approved' | 'rejected' | 'active') => void }) {
  const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  const router = useRouter()
  async function decide(next: 'approved' | 'rejected' | 'active') {
    setPending(true); setError('')
    let details: Record<string, string> = {}
    if (next === 'rejected') {
      const rejection_reason = window.prompt('Give a reason for rejecting this loan request.')?.trim()
      if (!rejection_reason) { setPending(false); return }
      details = { rejection_reason }
    }
    if (next === 'active') {
      const date = new Date()
      date.setMonth(date.getMonth() + termMonths)
      const due_date = window.prompt('Enter the loan due date (YYYY-MM-DD).', date.toISOString().slice(0, 10))?.trim()
      if (!due_date) { setPending(false); return }
      const disbursement_reference = window.prompt('Enter the cash, bank, or mobile-money disbursement reference (optional).')?.trim() ?? ''
      details = { due_date, disbursement_reference }
    }
    try { await apiRequest('/api/loans', { method: 'PATCH', body: JSON.stringify({ action: 'decision', id: loanId, status: next, ...details }) }); onUpdated?.(next); router.refresh() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update loan.') }
    finally { setPending(false) }
  }
  return <div className="flex flex-wrap items-center gap-2">{status === 'pending' && canApprove && <><button type="button" disabled={pending} onClick={() => decide('approved')} className="rounded-md bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Approve</button><button type="button" disabled={pending} onClick={() => decide('rejected')} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-50">Reject</button></>}{status === 'approved' && canDisburse && <button type="button" disabled={pending} onClick={() => decide('active')} className="rounded-md bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Disburse</button>}{error && <span role="alert" className="w-full text-xs text-red-700">{error}</span>}</div>
}
