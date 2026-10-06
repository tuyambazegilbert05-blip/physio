import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentApplicationUser } from '@/lib/security/application-session'
import { MemberWorkspace } from '@/features/members/components/MemberWorkspace'
import { AccountAccessHome } from '@/features/membership/components/AccountAccessHome'
import { GroupOperationsOverview } from '@/features/dashboard/components/GroupOperationsOverview'
import { getIncompleteOnboardingGroup } from '@/lib/membership/onboarding-destination'
import { redirect } from 'next/navigation'
import type { Group } from '@/types/group'

function SelectedGroupUnavailable() {
  return (
    <main className="mx-auto max-w-3xl p-5 sm:p-8">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
        <Building2 className="h-5 w-5 text-amber-800" aria-hidden="true" />
        <h1 className="mt-3 font-heading text-lg font-extrabold text-amber-950">This group is not available to your account</h1>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/80">Choose a group where you have an active membership or an assigned group permission.</p>
        <Link href="/dashboard" className="mt-4 inline-flex rounded-lg bg-amber-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-amber-950">Open available space</Link>
      </section>
    </main>
  )
}

export async function DashboardHome({
  groupId,
  view = 'personal',
}: {
  groupId?: string
  view?: 'personal' | 'workspace'
}) {
  const supabase = await createClient()
  const [user, groupsResult] = await Promise.all([
    getCurrentApplicationUser(),
    supabase
      .from('groups')
      .select('id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at')
      .order('created_at', { ascending: true }),
  ])
  if (groupsResult.error) throw groupsResult.error
  if (!user) return <AccountAccessHome />

  const { data: memberships, error: membershipsError } = await supabase
    .from('members')
    .select('id,group_id,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
  if (membershipsError) throw membershipsError
  const membershipIds = new Set((memberships ?? []).map((membership) => membership.group_id))
  const groups = (groupsResult.data ?? []) as Group[]
  if (groupId && !groups.some((candidate) => candidate.id === groupId)) {
    return <SelectedGroupUnavailable />
  }
  const group = (groupId ? groups.find((candidate) => candidate.id === groupId) : null) ??
    groups.find((candidate) => membershipIds.has(candidate.id)) ??
    groups[0] ??
    null
  if (!group) return <AccountAccessHome />

  if (view === 'personal') {
    const onboardingGroup = await getIncompleteOnboardingGroup(user.id, groupId)
    if (onboardingGroup) redirect(`/dashboard/onboarding?group=${encodeURIComponent(onboardingGroup)}`)
  }

  const [{ data: permissions, error: permissionsError }, { data: member, error: memberError }] =
    await Promise.all([
      supabase.rpc('current_group_permissions', { target_group: group.id }),
      supabase
        .from('members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle(),
    ])
  if (permissionsError) throw permissionsError
  if (memberError) throw memberError

  if (view === 'workspace') {
    return (
      <GroupOperationsOverview
        group={group}
        permissions={permissions ?? []}
      />
    )
  }

  if (!member) return <AccountAccessHome />
  return (
    <MemberWorkspace
      section="overview"
      preferredGroupId={group.id}
      groups={groups
        .filter((candidate) => membershipIds.has(candidate.id))
        .map(({ id, name }) => ({ id, name }))}
    />
  )
}
