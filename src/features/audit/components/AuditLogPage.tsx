'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { Select } from '@/components/ui/Select'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
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
  return <details className="mt-2">
    <summary className="cursor-pointer text-xs font-medium text-indigo-700">{label}</summary>
    <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(value, null, 2)}</pre>
  </details>
}

export function AuditLogPage() {
  const { group, groups, setGroup, loading: groupsLoading, error: groupsError } = useActiveGroup()
  const [access, setAccess] = useState<GroupAccess | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setAccess(null)
    setError('')
    if (!group) return () => { active = false }
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then((data) => { if (active) setAccess(data) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to check audit permissions.') })
    return () => { active = false }
  }, [group])

  const canRead = Boolean(access?.permissions.some((permission) => permission === 'audit:read' || permission === 'financial_audit:read'))
  const loadLogs = useCallback(async () => {
    if (!group || !canRead) return
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest<AuditLog[]>(`/api/audit?group_id=${encodeURIComponent(group.id)}`)
      setLogs(data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load the group audit history.')
    } finally {
      setLoading(false)
    }
  }, [group, canRead])

  useEffect(() => { void loadLogs() }, [loadLogs, reloadKey])

  if (groupsLoading) return <p className="p-8 text-sm text-slate-600">Loading your groups…</p>
  if (groupsError) return <main className="p-8"><FormError message={groupsError} /></main>

  return <>
    <DashboardHeader title="Audit history" description={`Review the traceable activity recorded for ${group?.name ?? 'your group'}.`} />
    <main className="mx-auto max-w-7xl space-y-5 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="grid gap-1 text-xs font-medium text-slate-600">Savings group
          <Select value={group?.id ?? ''} onChange={(event) => {
            const next = groups.find((item) => item.id === event.target.value)
            if (next) setGroup(next)
          }} className="min-w-56">
            {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </label>
        <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={loading || !canRead} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Refresh history</button>
      </div>
      <FormError message={error} />
      {!access && !error && <p role="status" className="text-sm text-slate-500">Checking your audit access…</p>}
      {access && !canRead && <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Audit history is available to authorized group auditors and financial officers.</p>}
      {canRead && loading && <p role="status" className="text-sm text-slate-500">Loading audit history…</p>}
      {canRead && !loading && logs.length === 0 && !error && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No audited activity is recorded for this group yet.</p>}
      {canRead && logs.length > 0 && <div className="space-y-3">
        {logs.map((log) => <article key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold capitalize text-slate-900">{log.action} · {log.entity.replaceAll('_', ' ')}</h2>
              <p className="mt-1 text-xs text-slate-500">{formatDate(log.created_at)} · Record {log.entity_id ?? '—'} · Actor {log.actor_id ?? 'System'}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {log.authority_roles.map((role) => <span key={role} className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800">{role.replaceAll('_', ' ')}</span>)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            {log.permission_used && <span>Permission: {log.permission_used}</span>}
            {log.details && <span>Details: {JSON.stringify(log.details)}</span>}
          </div>
          <JsonDetails label="Before" value={log.before_data} />
          <JsonDetails label="After" value={log.after_data} />
        </article>)}
        <p className="text-center text-xs text-slate-500">Showing the latest {logs.length} records (up to 200).</p>
      </div>}
    </main>
  </>
}
