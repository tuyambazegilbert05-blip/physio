'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, LockKeyhole, Save, ShieldAlert, SlidersHorizontal, Wrench } from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import { groupSystemModules } from '@/lib/group-system-modules'

type Controls = {
  group_id: string
  status: 'normal' | 'limited' | 'maintenance' | 'locked'
  message: string | null
  disabled_modules: string[]
  changed_by: string | null
  updated_at: string | null
}
type Snapshot = { controls: Controls; permissions: string[] }

export function SystemControlCenter({ preferredGroupId }: { preferredGroupId?: string }) {
  const { group, loading: groupLoading, error: groupError } = useActiveGroup(preferredGroupId)
  const [state, setState] = useState<{ groupId: string; snapshot: Snapshot } | null>(null)
  const [status, setStatus] = useState<Controls['status']>('normal')
  const [message, setMessage] = useState('')
  const [disabledModules, setDisabledModules] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const snapshot = group && state?.groupId === group.id ? state.snapshot : null

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<Snapshot>(`/api/system/controls?group_id=${encodeURIComponent(group.id)}`)
      .then((result) => {
        if (!active) return
        setState({ groupId: group.id, snapshot: result })
        setStatus(result.controls.status)
        setMessage(result.controls.message ?? '')
        setDisabledModules(result.controls.disabled_modules)
        setError('')
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'System controls could not be loaded.')
      })
    return () => {
      active = false
    }
  }, [group])

  const permissions = snapshot?.permissions ?? []
  const mayChangeModules = permissions.includes('system:modules')
  const maySetMaintenance = permissions.includes('system:maintenance')
  const mayLock = permissions.includes('system:lock')
  const mayConfigure = permissions.includes('system:configure')
  const mayEdit = mayChangeModules || maySetMaintenance || mayLock || mayConfigure
  const canSave = useMemo(() => {
    if (!snapshot) return false
    return (
      (snapshot.controls.status !== status &&
        (status === 'locked' || snapshot.controls.status === 'locked'
          ? mayLock
          : status === 'maintenance' ||
              snapshot.controls.status === 'maintenance' ||
              status === 'limited' ||
              snapshot.controls.status === 'limited'
            ? maySetMaintenance
            : mayConfigure)) ||
      (snapshot.controls.message !== (message.trim() || null) && mayConfigure) ||
      ([...snapshot.controls.disabled_modules].sort().join(',') !==
        [...disabledModules].sort().join(',') &&
        mayChangeModules)
    )
  }, [
    disabledModules,
    mayChangeModules,
    mayConfigure,
    maySetMaintenance,
    mayLock,
    message,
    snapshot,
    status,
  ])

  async function save() {
    if (!group) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await apiRequest('/api/system/controls', {
        method: 'PUT',
        body: JSON.stringify({
          group_id: group.id,
          status,
          message: message.trim() || null,
          disabled_modules: disabledModules,
        }),
      })
      const next = await apiRequest<Snapshot>(
        `/api/system/controls?group_id=${encodeURIComponent(group.id)}`,
      )
      setState({ groupId: group.id, snapshot: next })
      setStatus(next.controls.status)
      setMessage(next.controls.message ?? '')
      setDisabledModules(next.controls.disabled_modules)
      setNotice(
        'Group system controls saved. Business actions in closed modules are now blocked by the database.',
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'System controls could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  if (groupLoading)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Loading technical workspace…
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
          No group with technical access is available.
        </p>
      </main>
    )

  return (
    <>
      <DashboardHeader
        title="System control center"
        description={`${group.name} · group-scoped technical access`}
      />
      <main className="mx-auto w-full max-w-[1100px] space-y-5 p-4 sm:p-7 lg:p-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-500">
            <SlidersHorizontal className="h-4 w-4" />
            Technical workspace
          </p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-slate-950">{group.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Controls are scoped to this group. The selected state and closed modules are checked
            in the database on business writes; viewing records remains available under the usual
            data permissions.
          </p>
        </header>
        {error && <FormError message={error} />}
        {notice && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}
        {!snapshot && !error ? (
          <p
            role="status"
            className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500"
          >
            Loading access and group controls…
          </p>
        ) : null}
        {snapshot && (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <StatusCard
                icon={Activity}
                title="Current state"
                value={snapshot.controls.status}
                detail={
                  snapshot.controls.updated_at
                    ? `Updated ${new Date(snapshot.controls.updated_at).toLocaleString()}`
                    : 'Using default group settings'
                }
              />
              <StatusCard
                icon={LockKeyhole}
                title="Closed modules"
                value={String(snapshot.controls.disabled_modules.length)}
                detail="Only listed operations are blocked; group records remain permission-scoped."
              />
              <StatusCard
                icon={ShieldAlert}
                title="Your controls"
                value={mayEdit ? 'Management enabled' : 'View only'}
                detail={
                  mayEdit
                    ? 'The API verifies each changed control permission.'
                    : 'You can inspect the current operational state.'
                }
              />
            </section>
            {mayEdit ? (
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div>
                  <h2 className="font-heading text-lg font-extrabold text-slate-900">
                    Availability and access state
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Module restrictions affect create, update, approval, and other write actions.
                    Read permissions are enforced separately.
                  </p>
                </div>
                <FormField
                  htmlFor="group-system-status"
                  label="Group operating state"
                  hint="Maintenance and lock changes require their matching technical permission."
                >
                  <Select
                    id="group-system-status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as Controls['status'])}
                  >
                    <option
                      value="normal"
                      disabled={!mayConfigure && !maySetMaintenance && !mayLock}
                    >
                      Normal
                    </option>
                    <option value="limited" disabled={!maySetMaintenance}>
                      Limited
                    </option>
                    <option value="maintenance" disabled={!maySetMaintenance}>
                      Maintenance
                    </option>
                    <option value="locked" disabled={!mayLock}>
                      Locked
                    </option>
                  </Select>
                </FormField>
                <FormField
                  htmlFor="group-system-message"
                  label="Member-facing status message"
                  hint="Optional message shown to explain a restriction."
                >
                  <Input
                    id="group-system-message"
                    disabled={!mayConfigure}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={500}
                    placeholder="For example, loan requests are paused for cycle review."
                  />
                </FormField>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Module controls</h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    A closed module rejects writes through both the application and direct database
                    policies.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {groupSystemModules.map((module) => (
                      <label
                        key={module.key}
                        className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          disabled={!mayChangeModules}
                          checked={disabledModules.includes(module.key)}
                          onChange={(event) =>
                            setDisabledModules((current) =>
                              event.target.checked
                                ? [...new Set([...current, module.key])]
                                : current.filter((key) => key !== module.key),
                            )
                          }
                          className="accent-violet-700"
                        />
                        {module.label}
                        {!mayChangeModules && (
                          <span className="ml-auto text-[9px] text-slate-400">View only</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
                {snapshot.controls.status === 'locked' && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-800">
                    This group is locked. Business writes are blocked until an authorized technical
                    user restores access.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!canSave || saving}
                  onClick={() => void save()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving controls…' : 'Save system controls'}
                </button>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <Wrench className="h-5 w-5 text-slate-500" />
                <h2 className="mt-3 font-heading text-base font-extrabold text-slate-900">
                  Operational status
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Your technical role can view the current state for this group. Changing system
                  controls requires a separately assigned technical permission.
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </>
  )
}

function StatusCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: typeof Activity
  title: string
  value: string
  detail: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-slate-500">
          {title}
        </p>
        <Icon className="h-4 w-4 text-violet-700" />
      </div>
      <p className="mt-3 text-lg font-extrabold capitalize text-slate-900">{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{detail}</p>
    </article>
  )
}
