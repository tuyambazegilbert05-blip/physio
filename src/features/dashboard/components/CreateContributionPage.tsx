'use client'

import { useEffect, useState } from 'react'
import { ContributionForm } from '@/features/contributions/components/ContributionForm'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { memberService } from '@/features/members/services/member.service'
import type { Member } from '@/types/member'

export function CreateContributionPage() {
  const { group, loading } = useActiveGroup()
  const [members, setMembers] = useState<Member[]>([])
  useEffect(() => { if (group) memberService.list(group.id).then(setMembers).catch(() => setMembers([])) }, [group])
  if (loading) return <p className="p-8">Loading group…</p>
  if (!group) return <p className="p-8">Create a group before recording contributions.</p>
  return <section className="mx-auto max-w-3xl space-y-5 p-6"><div><p className="text-sm text-slate-500">{group.name}</p><h1 className="text-2xl font-semibold">Record a contribution</h1></div><ContributionForm groupId={group.id} members={members.map((member) => ({ id: member.id, name: member.full_name }))} /></section>
}
