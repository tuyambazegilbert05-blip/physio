'use client'

import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { GroupSelector } from '@/features/dashboard/components/GroupSelector'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { MemberCommunications } from '@/features/members/components/MemberCommunications'

export function OfficialCommunicationsPage() {
  const { groups, group, loading, error } = useActiveGroup()
  if (loading) return <p className="p-8 text-sm text-slate-500">Loading workspace…</p>
  if (!group)
    return <p className="p-8 text-sm text-slate-500">No group workspace is available.</p>

  return (
    <>
      <DashboardHeader
        title="Member communications"
        description={`${group.name} · Assigned official access`}
      />
      <main className="mx-auto w-full max-w-[1200px] space-y-5 p-4 sm:space-y-6 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-extrabold text-[#231044]">
              Private member conversations
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              You can see conversations only when you are a participant and have communications
              access for this group.
            </p>
          </div>
          {groups.length > 1 && (
            <GroupSelector
              groups={groups}
              currentId={group.id}
              returnTo="/dashboard/communications"
            />
          )}
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
          >
            {error}
          </p>
        ) : (
          <MemberCommunications groupId={group.id} audience="official" />
        )}
      </main>
    </>
  )
}
