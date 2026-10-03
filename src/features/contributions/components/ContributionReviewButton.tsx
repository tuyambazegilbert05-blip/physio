'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api'

export function ContributionReviewButton({ id, onReviewed }: { id: string; onReviewed?: (status: 'verified' | 'rejected') => void }) {
  const [error, setError] = useState(''); const [pending, setPending] = useState(false); const router = useRouter()
  async function review(status: 'verified' | 'rejected') {
    setPending(true); setError('')
    try { await apiRequest('/api/contributions', { method: 'PATCH', body: JSON.stringify({ id, status }) }); onReviewed?.(status); router.refresh() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update contribution.') }
    finally { setPending(false) }
  }
  return <span className="inline-flex flex-wrap gap-1">{(['verified', 'rejected'] as const).map((status) => <button type="button" key={status} disabled={pending} onClick={() => review(status)} className="rounded border px-2 py-1 text-xs capitalize disabled:opacity-50">{status}</button>)}{error && <span role="alert" className="w-full text-xs text-red-700">{error}</span>}</span>
}
