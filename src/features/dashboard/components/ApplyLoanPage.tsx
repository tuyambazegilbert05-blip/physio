'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { FormCard } from '@/components/ui/FormCard'
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
    if (!group || !user) return
    memberService
      .list(group.id)
      .then((items) => {
        setMember(items.find((item) => item.user_id === user.id) ?? null)
        setClaimable(
          items.find(
            (item) =>
              item.status === 'active' &&
              !item.user_id &&
              item.email?.trim().toLowerCase() === user.email?.trim().toLowerCase(),
          ) ?? null,
        )
      })
      .catch(() => {
        setMember(null)
        setClaimable(null)
      })
  }, [group, user])

  if (loading) return <p className="p-8 text-sm text-slate-500">Loading group…</p>
  if (!group)
    return (
      <p className="p-8 text-sm text-slate-500">
        Create or join a group before applying for a loan.
      </p>
    )
  if (!member && claimable)
    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-8">
        <FormCard
          title="Link your member record"
          description={`Your verified account email matches an unlinked member record in ${group.name}.`}
        >
          <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
            {group.name}
          </p>
          <div className="mt-5">
            <ClaimMemberButton
              member={claimable}
              onClaimed={() => {
                setMember(claimable)
                setClaimable(null)
              }}
            />
          </div>
        </FormCard>
      </main>
    )
  if (!member)
    return (
      <main className="mx-auto max-w-3xl p-5 sm:p-8">
        <p className="rounded-[24px] border border-indigo-100 bg-white/85 p-5 text-sm leading-relaxed text-slate-600 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.4)]">
          Your account is not linked to an active member record in this group. Ask a group
          administrator to add your verified email address.
        </p>
      </main>
    )

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
          {group.name}
        </p>
      </header>
      <FormCard
        title="Apply for a loan"
        description="Submit a request for committee review. Your requested terms are reviewed before a loan is approved."
      >
        <LoanForm groupId={group.id} memberId={member.id} currency={group.currency} />
      </FormCard>
    </main>
  )
}
