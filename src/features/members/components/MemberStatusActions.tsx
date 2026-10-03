'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/api'
import type { MemberStatus } from '@/types/member'

const statuses: MemberStatus[] = ['active', 'inactive', 'suspended']

export function MemberStatusActions({ memberId, groupId, status, onChanged }: { memberId: string; groupId: string; status: MemberStatus; onChanged: (status: MemberStatus) => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function changeStatus(nextStatus: MemberStatus) {
    if (nextStatus === status) return
    setPending(true)
    setError('')
    try {
      await apiRequest(`/api/members?member_id=${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ group_id: groupId, status: nextStatus }),
      })
      onChanged(nextStatus)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update membership status.')
    } finally {
      setPending(false)
    }
  }

  return <div className="flex flex-wrap items-center gap-2"><span className="capitalize">{status}</span><select aria-label="Change membership status" disabled={pending} value={status} onChange={(event) => void changeStatus(event.target.value as MemberStatus)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"><option value={status}>{status}</option>{statuses.filter((option) => option !== status).map((option) => <option key={option} value={option}>{option === 'active' ? 'Reactivate' : `Set ${option}`}</option>)}</select>{error && <span role="alert" className="text-xs text-red-700">{error}</span>}</div>
}
