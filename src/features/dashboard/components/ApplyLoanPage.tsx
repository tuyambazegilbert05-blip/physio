'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { LoanForm } from '@/features/loans/components/LoanForm'
import { ClaimMemberButton } from '@/features/members/components/ClaimMemberButton'
import { memberService } from '@/features/members/services/member.service'
import type { Member } from '@/types/member'

export function ApplyLoanPage() {
  const { group, loading } = useActiveGroup()
  const { user } = useAuth()
  const [member, setMember] = useState<Member | null>(null)
  const [claimable, setClaimable] = useState<Member | null>(null)
  useEffect(() => {
    if (group && user) memberService.list(group.id).then((items) => {
      setMember(items.find((item) => item.user_id === user.id) ?? null)
      setClaimable(items.find((item) => item.status === 'active' && !item.user_id && item.email?.trim().toLowerCase() === user.email?.trim().toLowerCase()) ?? null)
    }).catch(() => { setMember(null); setClaimable(null) })
  }, [group, user])
  if (loading) return <p className="p-8">Loading group…</p>
  if (!group) return <p className="p-8">Create or join a group before applying for a loan.</p>
  if (!member && claimable) return <section className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-2xl font-semibold">Link your member record</h1><p className="text-sm text-slate-600">Your verified account email matches an unlinked member record in {group.name}.</p><ClaimMemberButton member={claimable} onClaimed={() => { setMember(claimable); setClaimable(null) }} /></section>
  if (!member) return <p className="p-8">Your account is not linked to an active member record in this group. Ask a group administrator to add your verified email address.</p>
  return <section className="mx-auto max-w-3xl space-y-5 p-6"><div><p className="text-sm text-slate-500">{group.name}</p><h1 className="text-2xl font-semibold">Apply for a loan</h1></div><LoanForm groupId={group.id} memberId={member.id} /></section>
}
