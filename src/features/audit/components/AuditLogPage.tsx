'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { Select } from '@/components/ui/Select'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { canReadAuditView, type AuditView } from '@/lib/audit-access'
import type { Json } from '@/types/database'
import type { GroupAccess } from '@/types/role'

type AuditLog = {
  id: number
  group_id: string | null
  actor_id: string | null
  action: string
  entity: string
  entity_id: string | null
  details: Json
  permission_used: string | null
  authority_roles: string[]
  before_data: Json | null
  after_data: Json | null
  created_at: string
}

function JsonDetails({ label, value }: { label: string; value: Json | null }) {
  if (value === null) return null
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-bold text-[#5A36E8]">{label} record</summary>
      <pre className="mt-2 max-h-72 overflow-auto rounded-2xl border border-indigo-100/15 bg-[#111936] p-4 text-xs leading-relaxed text-indigo-50">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  )
}

export function AuditLogPage({ view = 'group' }: { view?: AuditView }) {
  const securityView = view === 'security'
  const { group, groups, setGroup, loading: groupsLoading, error: groupsError } = useActiveGroup()
  const [accessResult, setAccessResult] = useState<{
    groupId: string
    access: GroupAccess | null
  } | null>(null)
  const [logsResult, setLogsResult] = useState<{ groupId: string; logs: AuditLog[] } | null>(null)
  const [errorResult, setErrorResult] = useState<{ groupId: string; message: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const access = group && accessResult?.groupId === group.id ? accessResult.access : null
  const currentLogs = group && logsResult?.groupId === group.id ? logsResult.logs : null
  const logs = currentLogs ?? []
  const error = group && errorResult?.groupId === group.id ? errorResult.message : ''

  useEffect(() => {
    let active = true
    if (!group)
      return () => {
        active = false
      }
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then((data) => {
        if (active) setAccessResult({ groupId: group.id, access: data })
      })
      .catch((reason: unknown) => {
        if (!active) return
        setAccessResult({ groupId: group.id, access: null })
        setErrorResult({
          groupId: group.id,
          message: reason instanceof Error ? reason.message : 'Unable to check audit permissions.',
        })
      })
    return () => {
      active = false
    }
  }, [group])

  const canRead = canReadAuditView(view, access?.permissions)

  useEffect(() => {
    if (!group || !canRead) return
    let active = true
    const viewParameter = securityView ? '&view=security' : ''
    apiRequest<AuditLog[]>(`/api/audit?group_id=${encodeURIComponent(group.id)}${viewParameter}`)
      .then((data) => {
        if (!active) return
        setLogsResult({ groupId: group.id, logs: data })
        setErrorResult(null)
      })
      .catch((reason: unknown) => {
        if (active) {
          setErrorResult({
            groupId: group.id,
            message: reason instanceof Error ? reason.message : 'Unable to load the audit history.',
          })
        }
      })
      .finally(() => {
        if (active) setRefreshing(false)
      })
    return () => {
      active = false
    }
  }, [group, canRead, reloadKey, securityView])

  const loading = Boolean(group && canRead && !currentLogs) || refreshing

  if (groupsLoading) return <p className="p-8 text-sm text-slate-600">Loading your groups…</p>
  if (groupsError)
    return (
      <main className="p-8">
        <FormError message={groupsError} />
      </main>
    )

  return (
    <>
      <DashboardHeader
        title={securityView ? 'Security and access audit' : 'Audit history'}
        description={
          securityView
            ? `Review role and technical-control changes recorded for ${group?.name ?? 'your group'}.`
            : `Review the traceable activity recorded for ${group?.name ?? 'your group'}.`
        }
      />
      <main className="mx-auto w-full max-w-[1500px] space-y-6 p-5 sm:space-y-8 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="grid gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-500">
            Savings group
            <Select
              value={group?.id ?? ''}
              onChange={(event) => {
                const next = groups.find((item) => item.id === event.target.value)
                if (next) setGroup(next)
              }}
              className="min-w-56"
            >
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true)
              setReloadKey((value) => value + 1)
            }}
            disabled={loading || !canRead}
            className="rounded-xl border border-indigo-100 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#4d42cf] shadow-sm transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh history
          </button>
        </div>
        <FormError message={error} />
        {!access && !error && (
          <p
            role="status"
            className="rounded-2xl border border-indigo-100/80 bg-white/65 px-4 py-3 text-sm text-slate-500"
          >
            Checking your audit access…
          </p>
        )}
        {access && !canRead && (
          <p className="rounded-[24px] border border-indigo-100/80 bg-white/85 p-5 text-sm leading-relaxed text-slate-600 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.4)]">
            {securityView
              ? 'Security audit access is required to review these access and system-control events.'
              : 'Audit history is available to authorized group auditors and financial officers.'}
          </p>
        )}
        {canRead && loading && (
          <p
            role="status"
            className="rounded-2xl border border-indigo-100/80 bg-white/65 px-4 py-3 text-sm text-slate-500"
          >
            Loading audit history…
          </p>
        )}
        {canRead && !loading && logs.length === 0 && !error && (
          <p className="rounded-[24px] border border-dashed border-indigo-200 bg-white/70 p-10 text-center text-sm text-slate-500">
            {securityView
              ? 'No role or technical-control changes have been recorded for this group yet.'
              : 'No audited activity is recorded for this group yet.'}
          </p>
        )}
        {canRead && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <article
                key={log.id}
                className="rounded-[24px] border border-white/90 bg-white/88 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.42)] backdrop-blur-xl sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading font-bold capitalize text-[#081233]">
                      {log.action} · {log.entity.replaceAll('_', ' ')}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {formatDate(log.created_at)} · Record {log.entity_id ?? '—'} · Actor{' '}
                      {log.actor_id ?? 'System'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {log.authority_roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-[10px] font-bold text-[#4d42cf]"
                      >
                        {role.replaceAll('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-indigo-50 pt-3 text-xs text-slate-500">
                  {log.permission_used && <span>Permission: {log.permission_used}</span>}
                  {log.details && <span>Details: {JSON.stringify(log.details)}</span>}
                </div>
                <JsonDetails label="Before" value={log.before_data} />
                <JsonDetails label="After" value={log.after_data} />
              </article>
            ))}
            <p className="pt-2 text-center text-xs text-slate-400">
              Showing the latest {logs.length} records (up to 200).
            </p>
          </div>
        )}
      </main>
    </>
  )
}
