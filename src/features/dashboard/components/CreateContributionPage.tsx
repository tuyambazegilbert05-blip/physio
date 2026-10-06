'use client'

import { useEffect, useState } from 'react'
import { ContributionForm } from '@/features/contributions/components/ContributionForm'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { memberService } from '@/features/members/services/member.service'
import type { Member } from '@/types/member'

export function CreateContributionPage() {
  const { group, loading } = useActiveGroup()
  const [members, setMembers] = useState<Member[]>([])
  useEffect(() => {
    if (group)
      memberService
        .list(group.id)
        .then(setMembers)
        .catch(() => setMembers([]))
  }, [group])

  if (loading) return <p className="p-8 text-sm text-slate-500">Loading group…</p>
  if (!group)
    return (
      <p className="p-8 text-sm text-slate-500">Create a group before recording contributions.</p>
    )

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
          {group.name}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
          Record a contribution
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Add a member payment to the group ledger for review and reporting.
        </p>
      </header>
      <section className="rounded-[28px] border border-white/90 bg-white/88 p-5 shadow-[0_20px_56px_-40px_rgba(36,55,245,0.55)] backdrop-blur-xl sm:p-7">
        <ContributionForm
          groupId={group.id}
          members={members.map((member) => ({
            id: member.id,
            name: member.full_name,
          }))}
        />
      </section>
    </main>
  )
}
