'use client'

import { useState, type FormEvent } from 'react'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { apiRequest } from '@/lib/api'
import { roleLabels, type GroupAccess, type GroupRole } from '@/types/role'

const assignableRoles: GroupRole[] = [
  'committee_member',
  'group_administrator',
  'treasurer',
  'secretary',
  'system_administrator',
  'technician',
  'security_administrator',
  'super_administrator',
]

export function RoleAssignmentsPanel({ groupId, access, onChanged }: { groupId: string; access: GroupAccess; onChanged: () => void }) {
  const [email, setEmail] = useState('')
  const [chairpersonEmail, setChairpersonEmail] = useState('')
  const [role, setRole] = useState<GroupRole>('committee_member')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const canManageTechnical = access.permissions.includes('system:users_manage')
  const canManageSuperAdministrator = access.permissions.includes('superadmin:manage')
  const canManage = access.permissions.includes('roles:manage')
  const canTransferChairperson = access.roles.includes('chairperson')

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await apiRequest('/api/roles', { method: 'POST', body: JSON.stringify({ group_id: groupId, email, role }) })
      setEmail('')
      onChanged()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not assign this role.')
    } finally {
      setPending(false)
    }
  }

  async function removeAssignment(userId: string, assignmentRole: GroupRole) {
    setPending(true)
    setError('')
    try {
      await apiRequest('/api/roles', { method: 'DELETE', body: JSON.stringify({ group_id: groupId, user_id: userId, role: assignmentRole }) })
      onChanged()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not remove this role.')
    } finally {
      setPending(false)
    }
  }

  async function transferChairperson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await apiRequest('/api/roles/transfer', { method: 'POST', body: JSON.stringify({ group_id: groupId, email: chairpersonEmail }) })
      setChairpersonEmail('')
      onChanged()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not transfer the chairperson role.')
    } finally {
      setPending(false)
    }
  }

  if (!canManage) return null

  const visibleRoles = assignableRoles.filter((item) => {
    if (item === 'super_administrator') return canManageSuperAdministrator
    if (['system_administrator', 'technician', 'security_administrator'].includes(item)) return canManageTechnical
    return true
  })
  return <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="role-access-heading">
    <div>
      <h2 id="role-access-heading" className="font-semibold">Roles and access</h2>
      <p className="mt-1 text-sm text-slate-600">Membership stays separate. A registered user can receive several group roles, and technicians can be assigned without becoming members.</p>
    </div>
    <FormError message={error} />
    <form onSubmit={assign} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <FormField htmlFor="role-account-email" label="Verified registered account email"><Input id="role-account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></FormField>
      <FormField htmlFor="role-choice" label="Role"><Select id="role-choice" value={role} onChange={(event) => setRole(event.target.value as GroupRole)}>{visibleRoles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</Select></FormField>
      <button type="submit" disabled={pending} className="rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">{pending ? 'Saving…' : 'Assign role'}</button>
    </form>
    {canTransferChairperson && <form onSubmit={transferChairperson} className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <div><p className="text-sm font-semibold text-slate-900">Transfer chairperson</p><p className="mt-1 text-xs text-slate-600">The recipient must already be an active member. Chairperson, committee, and system-administrator roles transfer together; other roles and membership stay with their current holders.</p><FormField htmlFor="new-chairperson-email" label="New chairperson account email"><Input id="new-chairperson-email" type="email" value={chairpersonEmail} onChange={(event) => setChairpersonEmail(event.target.value)} required autoComplete="email" /></FormField></div>
      <button type="submit" disabled={pending} className="rounded-md border border-amber-400 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50">Transfer role</button>
    </form>}
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-2 pr-4 font-medium">Account</th><th className="py-2 pr-4 font-medium">Role</th><th className="py-2 pr-4 font-medium">Assigned</th><th className="py-2 text-right font-medium">Action</th></tr></thead>
        <tbody>{access.assignments.map((assignment) => {
          const chairpersonHoldsAssignment = access.assignments.some((item) => item.user_id === assignment.user_id && item.role_key === 'chairperson')
          const protectedAssignment = assignment.user_id === access.current_user_id || assignment.role_key === 'chairperson' || (assignment.role_key === 'super_administrator' && !canManageSuperAdministrator) || (['system_administrator', 'committee_member'].includes(assignment.role_key) && chairpersonHoldsAssignment)
          const removable = !protectedAssignment && (canManageTechnical || !['technician', 'security_administrator', 'system_administrator'].includes(assignment.role_key))
          return <tr key={`${assignment.user_id}-${assignment.role_key}`} className="border-b border-slate-100 last:border-0">
            <td className="py-3 pr-4"><span className="block font-medium text-slate-900">{assignment.full_name}</span><span className="text-xs text-slate-500">{assignment.email ?? 'Email unavailable'}</span></td>
            <td className="py-3 pr-4">{roleLabels[assignment.role_key]}</td>
            <td className="py-3 pr-4 text-slate-600">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(assignment.granted_at))}</td>
            <td className="py-3 text-right">{removable ? <button type="button" disabled={pending} onClick={() => removeAssignment(assignment.user_id, assignment.role_key)} className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50">Remove</button> : <span className="text-xs text-slate-400">Protected</span>}</td>
          </tr>
        })}</tbody>
      </table>
      {access.assignments.length === 0 && <p className="py-4 text-sm text-slate-500">No additional roles have been assigned.</p>}
    </div>
  </section>
}
