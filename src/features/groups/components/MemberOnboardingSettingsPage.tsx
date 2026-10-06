'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { GroupOnboardingConfig } from '@/features/groups/components/GroupOnboardingConfig'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { hasAnyPermission } from '@/lib/group-workspace-access'
import type { GroupAccess } from '@/types/role'

export function MemberOnboardingSettingsPage({ preferredGroupId }: { preferredGroupId?: string }) {
  const { group, loading, error: groupError } = useActiveGroup(preferredGroupId)
  const [accessState, setAccessState] = useState<{
    groupId: string
    access: GroupAccess | null
    error?: string
  } | null>(null)

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then((access) => {
        if (active) setAccessState({ groupId: group.id, access })
      })
      .catch((cause: unknown) => {
        if (active) {
          setAccessState({
            groupId: group.id,
            access: null,
            error: cause instanceof Error ? cause.message : 'Group access could not be loaded.',
          })
        }
      })
    return () => { active = false }
  }, [group])

  const access = group && accessState?.groupId === group.id ? accessState.access : null
  const accessError = group && accessState?.groupId === group.id ? accessState.error : undefined
  const accessLoading = Boolean(group && accessState?.groupId !== group.id)
  const canManageOnboarding = hasAnyPermission(access?.permissions, 'onboarding:manage', 'groups:manage')

  if (loading) return <p role="status" className="p-6 text-sm text-slate-500">Loading Ikimina…</p>
  if (groupError) return <p role="alert" className="m-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{groupError}</p>
  if (!group) return <p className="p-6 text-sm text-slate-500">No Ikimina is available to configure.</p>

  return (
    <>
      <DashboardHeader title="Member onboarding setup" description={`${group.name} · Group requirements and member information`} />
      <main className="mx-auto w-full max-w-[1000px] space-y-5 p-4 sm:p-7 lg:p-8">
        {accessLoading ? (
          <p role="status" className="rounded-xl border border-indigo-100 bg-white p-4 text-sm text-slate-500">Checking group permissions…</p>
        ) : accessError ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{accessError}</p>
        ) : !canManageOnboarding ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-heading text-base font-extrabold text-amber-950">Onboarding setup access denied</h2>
            <p className="mt-1.5 text-sm text-amber-900/80">You need permission to manage this Ikimina’s member onboarding requirements.</p>
          </section>
        ) : (
          <GroupOnboardingConfig groupId={group.id} />
        )}
      </main>
    </>
  )
}
