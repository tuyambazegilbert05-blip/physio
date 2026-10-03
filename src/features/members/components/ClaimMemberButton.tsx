'use client'

import { useState } from 'react'
import { memberService } from '@/features/members/services/member.service'
import type { Member } from '@/types/member'

export function ClaimMemberButton({ member, onClaimed }: { member: Member; onClaimed: () => void }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function claim() {
    setPending(true)
    setError('')
    try {
      await memberService.claim(member.id)
      onClaimed()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not link this member record.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={claim} disabled={pending} className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
        {pending ? 'Linking member record…' : `Link ${member.full_name} to this account`}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
