'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, UsersRound } from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { RoleAssignmentsPanel } from '@/features/roles/components/RoleAssignmentsPanel'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { roleLabels, type GroupAccess } from '@/types/role'

export function RoleAccessPage({ preferredGroupId }: { preferredGroupId?: string }) {
  const { group, loading: groupLoading, error: groupError } = useActiveGroup(preferredGroupId)
  const [result, setResult] = useState<{ groupId: string; access: GroupAccess } | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const access = group && result?.groupId === group.id ? result.access : null
  const canReadAssignments = Boolean(
    access?.permissions.some((permission) => ['roles:read', 'roles:manage'].includes(permission)),
  )
  const canManageAssignments = Boolean(access?.permissions.includes('roles:manage'))

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then((data) => {
        if (!active) return
        setResult({ groupId: group.id, access: data })
        setError('')
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : 'Role assignments could not be loaded.',
          )
      })
    return () => {
      active = false
    }
  }, [group, refresh])

  if (groupLoading)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Loading role access…
      </p>
    )
  if (groupError)
    return (
      <p role="alert" className="m-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {groupError}
      </p>
    )
  if (!group)
    return (
      <main className="p-5">
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No Ikimina with role access is available.
        </p>
      </main>
    )

  return (
    <>
      <DashboardHeader
        title="Role assignments"
        description={`${group.name} · membership and responsibilities are managed separately`}
      />
      <main className="mx-auto w-full max-w-[1100px] space-y-5 p-4 sm:p-7 lg:p-8">
        <header className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-7">
          <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-indigo-700">
            <ShieldCheck className="h-4 w-4" />
            Group-scoped access
          </p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-slate-950">{group.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Roles add responsibilities within this Ikimina. They do not create membership, and every
            action still depends on its specific permission.
          </p>
        </header>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </p>
        )}
        {!access && !error && (
          <p
            role="status"
            className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500"
          >
            Loading your effective group permissions…
          </p>
        )}
        {access && !canReadAssignments && (
          <section
            role="alert"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"
          >
            You do not have permission to view role assignments in this Ikimina.
          </section>
        )}
        {canReadAssignments && !canManageAssignments && access && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <UsersRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-extrabold text-slate-900">
                  Assigned responsibilities
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {access.assignments.length} assigned{' '}
                  {access.assignments.length === 1 ? 'role' : 'roles'} · your permissions combine
                  across assignments.
                </p>
              </div>
            </div>
            {access.assignments.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                No additional roles have been assigned in this group.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-4 font-semibold">Account</th>
                      <th className="py-2 pr-4 font-semibold">Role</th>
                      <th className="py-2 font-semibold">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {access.assignments.map((assignment) => (
                      <tr
                        key={`${assignment.user_id}-${assignment.role_key}`}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <span className="block font-semibold text-slate-900">
                            {assignment.full_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {assignment.email ?? 'Email unavailable'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          {roleLabels[assignment.role_key]}
                        </td>
                        <td className="py-3 text-slate-600">
                          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                            new Date(assignment.granted_at),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
        {canManageAssignments && access && (
          <RoleAssignmentsPanel
            groupId={group.id}
            access={access}
            onChanged={() => setRefresh((version) => version + 1)}
          />
        )}
      </main>
    </>
  )
}
