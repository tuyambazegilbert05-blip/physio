'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api'

export function LoanOwnerActions({ loanId, status, isOwn, canManage }: { loanId: string; status: string; isOwn: boolean; canManage: boolean }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function cancel() {
    const reason = window.prompt('Optional note for cancelling this approved loan before it is disbursed.')
    if (reason === null) return
    setPending(true); setError('')
    try { await apiRequest('/api/loans', { method: 'PATCH', body: JSON.stringify({ action: 'cancel_approved', id: loanId, reason }) }); router.refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not cancel this loan.') }
    finally { setPending(false) }
  }

  async function extend() {
    const nextDate = window.prompt('Enter the new due date (YYYY-MM-DD).')?.trim()
    if (!nextDate) return
    setPending(true); setError('')
    try { await apiRequest('/api/loans', { method: 'PATCH', body: JSON.stringify({ action: 'extend', id: loanId, due_date: nextDate }) }); router.refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not extend this loan.') }
    finally { setPending(false) }
  }

  return <span className="flex flex-wrap gap-2">{status === 'approved' && isOwn && <button type="button" disabled={pending} onClick={() => void cancel()} className="rounded border px-2 py-1 text-xs">Cancel before disbursement</button>}{status === 'active' && canManage && <button type="button" disabled={pending} onClick={() => void extend()} className="rounded border px-2 py-1 text-xs">Extend term</button>}{error && <span role="alert" className="text-xs text-red-700">{error}</span>}</span>
}
