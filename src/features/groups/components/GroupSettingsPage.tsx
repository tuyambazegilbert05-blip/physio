'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { groupService } from '@/features/groups/services/group.service'
import { apiRequest } from '@/lib/api'
import type { GroupAccess } from '@/types/role'
import { GroupOnboardingConfig } from '@/features/groups/components/GroupOnboardingConfig'

export function GroupSettingsPage() {
  const { group, setGroup, loading, error: groupError } = useActiveGroup()
  const [accessState, setAccessState] = useState<{ groupId: string; access: GroupAccess | null; error?: string } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const access = group && accessState?.groupId === group.id ? accessState.access : null
  const accessError = group && accessState?.groupId === group.id ? accessState.error : undefined
  const accessLoading = Boolean(group && accessState?.groupId !== group.id)

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then((snapshot) => { if (active) setAccessState({ groupId: group.id, access: snapshot }) })
      .catch((cause: unknown) => { if (active) setAccessState({ groupId: group.id, access: null, error: cause instanceof Error ? cause.message : 'Access permissions could not be loaded.' }) })
    return () => { active = false }
  }, [group])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!group) return
    const values = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    setSaved(false)
    try {
      const updated = await groupService.update({
        group_id: group.id,
        name: String(values.get('name') ?? ''),
        currency: String(values.get('currency') ?? ''),
        contribution_amount: Number(values.get('contribution_amount')),
        contribution_frequency: String(values.get('contribution_frequency')) as typeof group.contribution_frequency,
      })
      setGroup(updated)
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The group settings could not be saved.')
    } finally {
      setPending(false)
    }
  }

  if (loading) return <p role="status" className="p-6 text-sm text-slate-500">Loading Ikimina settings…</p>
  if (groupError) return <p role="alert" className="m-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{groupError}</p>
  if (!group) return <p className="p-6 text-sm text-slate-500">No group is available for settings.</p>

  return (
    <>
      <DashboardHeader title="Group settings" description={`${group.name} · Manage Ikimina`} />
      <main className="mx-auto w-full max-w-[1000px] space-y-5 p-4 sm:p-7 lg:p-8">
        {accessLoading ? (
          <p role="status" className="rounded-xl border border-indigo-100 bg-white p-4 text-sm text-slate-500">Loading group permissions…</p>
        ) : accessError ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{accessError}</p>
        ) : !access ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-heading text-base font-extrabold text-amber-950">Settings access unavailable</h2>
            <p className="mt-1.5 text-sm text-amber-900/80">Your group permissions do not include access to change group profile settings.</p>
          </section>
        ) : !access.permissions.includes('groups:manage') ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-heading text-base font-extrabold text-amber-950">Settings access denied</h2>
            <p className="mt-1.5 text-sm text-amber-900/80">Group profile changes require the explicit groups:manage permission.</p>
          </section>
        ) : (
          <>
          <section className="rounded-2xl border border-indigo-100/80 bg-white p-5 shadow-[0_18px_46px_-38px_rgba(36,55,245,0.55)] sm:p-7">
            <div className="mb-5 border-b border-indigo-50 pb-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-violet-700">Group profile</p>
              <h2 className="mt-1 font-heading text-lg font-extrabold text-[#081233]">Basic Ikimina information</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Changes apply to this Ikimina only. Technical platform and security configuration are managed separately.</p>
            </div>
            <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2">
              <FormError message={error} />
              {saved && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 sm:col-span-2">Group settings saved.</p>}
              <FormField htmlFor="group-name" label="Ikimina name"><Input id="group-name" name="name" defaultValue={group.name} minLength={2} maxLength={120} required /></FormField>
              <FormField htmlFor="group-currency" label="Currency" hint="Use the three-letter currency code used by the group ledger."><Input id="group-currency" name="currency" defaultValue={group.currency} minLength={3} maxLength={3} required /></FormField>
              <FormField htmlFor="group-contribution" label="Default contribution amount"><Input id="group-contribution" name="contribution_amount" type="number" min="1" step="1" defaultValue={group.contribution_amount} required /></FormField>
              <FormField htmlFor="group-frequency" label="Default contribution frequency"><Select id="group-frequency" name="contribution_frequency" defaultValue={group.contribution_frequency}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></Select></FormField>
              <div className="sm:col-span-2"><FormSubmit pending={pending}>Save group profile</FormSubmit></div>
            </form>
          </section>
          <GroupOnboardingConfig groupId={group.id} />
          </>
        )}
      </main>
    </>
  )
}
