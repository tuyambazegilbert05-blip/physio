'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { DataTable } from '@/components/tables/DataTable'
import { TableFilters } from '@/components/tables/TableFilters'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { FormError } from '@/components/forms/FormError'
import { GroupForm } from '@/features/groups/components/GroupForm'
import { MemberForm } from '@/features/members/components/MemberForm'
import { MemberStatusActions } from '@/features/members/components/MemberStatusActions'
import { RoleAssignmentsPanel } from '@/features/roles/components/RoleAssignmentsPanel'
import { ContributionReviewButton } from '@/features/contributions/components/ContributionReviewButton'
import { LoanDecisionButtons } from '@/features/loans/components/LoanDecisionButtons'
import { LoanDraftActions } from '@/features/loans/components/LoanDraftActions'
import { LoanRepaymentActions } from '@/features/loans/components/LoanRepaymentActions'
import { LoanOwnerActions } from '@/features/loans/components/LoanOwnerActions'
import { MeetingDecisionsPanel } from '@/features/meetings/components/MeetingDecisionsPanel'
import { MeetingMinutesPanel } from '@/features/meetings/components/MeetingMinutesPanel'
import type { GroupAccess } from '@/types/role'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { useDebounce } from '@/hooks/useDebounce'
import { apiRequest } from '@/lib/api'
import type { Group } from '@/types/group'

const resources = {
  members: { title: 'Members', endpoint: '/api/members', createHref: null, columns: [['full_name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['status', 'Membership']] },
  contributions: { title: 'Contributions', endpoint: '/api/contributions', createHref: '/dashboard/contributions/new', columns: [['period', 'Period'], ['contribution_type', 'Type'], ['amount', 'Amount'], ['status', 'Status'], ['created_at', 'Recorded']] },
  loans: { title: 'Loans', endpoint: '/api/loans', createHref: '/dashboard/loans/apply', columns: [['principal', 'Principal'], ['outstanding_amount', 'Principal due'], ['outstanding_interest', 'Interest due'], ['term_months', 'Term'], ['purpose', 'Purpose'], ['status', 'Status'], ['due_date', 'Due date']] },
  meetings: { title: 'Meetings', endpoint: '/api/meetings', createHref: '/dashboard/meetings/new', columns: [['title', 'Title'], ['starts_at', 'Starts'], ['location', 'Location'], ['agenda', 'Agenda']] },
} as const

type ResourceName = keyof typeof resources
type Row = Record<string, unknown> & { id: string }

export function DashboardModule({ resource, itemId }: { resource: ResourceName; itemId?: string }) {
  const config = resources[resource]
  const { groups, group, setGroup, loading: groupsLoading, error: groupError } = useActiveGroup()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accessError, setAccessError] = useState('')
  const [query, setQuery] = useState('')
  const [access, setAccess] = useState<GroupAccess | null>(null)
  const [accessVersion, setAccessVersion] = useState(0)
  const [showRolePanel, setShowRolePanel] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const debouncedQuery = useDebounce(query)

  useEffect(() => {
    if (!group) return
    let active = true
    setLoading(true); setError('')
    apiRequest<Row[]>(`${config.endpoint}?group_id=${encodeURIComponent(group.id)}`)
      .then((items) => { if (active) setRows(items) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : `Unable to load ${config.title.toLowerCase()}.`) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [config.endpoint, config.title, group])

  useEffect(() => {
    let active = true
    setAccess(null)
    setAccessError('')
    if (!group) return
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then((snapshot) => { if (active) setAccess(snapshot) })
      .catch((reason: unknown) => { if (active) { setAccess(null); setAccessError(reason instanceof Error ? reason.message : 'Could not load access permissions.') } })
    return () => { active = false }
  }, [group, accessVersion])

  const filtered = useMemo(() => rows.filter((row) => {
    if (itemId && row.id !== itemId) return false
    return Object.values(row).join(' ').toLowerCase().includes(debouncedQuery.toLowerCase())
  }), [rows, debouncedQuery, itemId])
  const can = (permission: string) => Boolean(access?.permissions.includes(permission))
  const canVerifyContributions = can('contributions:verify')
  const canApproveLoans = can('loans:approve')
  const canDisburseLoans = can('loans:disburse')
  const canRecordRepayments = can('repayments:record')
  const canVerifyRepayments = can('repayments:verify')
  const canManageMembers = can('members:manage')
  const canManageRoles = can('roles:manage')
  const canViewResource = resource === 'members'
    ? access?.is_member || can('members:read')
    : resource === 'contributions'
      ? access?.is_member || can('contributions:read')
      : resource === 'loans'
        ? access?.is_member || can('loans:read')
        : access?.is_member || can('meetings:read')
  const canCreate = resource === 'contributions'
    ? access?.is_member || can('contributions:record')
    : resource === 'loans'
      ? access?.is_member
      : resource === 'meetings' && can('meetings:manage')
  const columns = config.columns.map(([key, label]) => ({ key, label, render: (row: Row) => {
    if (resource === 'meetings' && key === 'title') return <Link href={`/dashboard/meetings/${row.id}`} className="font-medium text-indigo-700 hover:underline">{String(row.title ?? 'Untitled meeting')}</Link>
    if (resource === 'contributions' && key === 'status' && canVerifyContributions && row.status === 'pending') {
      return <ContributionReviewButton id={row.id} onReviewed={(status) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item))} />
    }
    if (resource === 'members' && key === 'status' && canManageMembers && group) {
      return <MemberStatusActions memberId={row.id} groupId={group.id} status={row.status as 'active' | 'inactive' | 'suspended'} onChanged={(status) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item))} />
    }
    if (resource === 'loans' && key === 'status' && row.is_draft && access?.is_member) {
      return <LoanDraftActions loan={{ id: row.id, principal: Number(row.principal), interest_rate: Number(row.interest_rate), term_months: Number(row.term_months), purpose: String(row.purpose ?? '') }} />
    }
    if (resource === 'loans' && key === 'status' && ['active', 'defaulted'].includes(String(row.status)) && (row.is_own || canRecordRepayments || canVerifyRepayments || can('loans:manage'))) {
      return <div className="space-y-2"><LoanRepaymentActions loanId={row.id} currency={group?.currency ?? 'RWF'} canSubmit={Boolean(row.is_own) || canRecordRepayments} canVerify={canVerifyRepayments} /><LoanOwnerActions loanId={row.id} status={String(row.status)} isOwn={Boolean(row.is_own)} canManage={can('loans:manage')} /></div>
    }
    if (resource === 'loans' && key === 'status' && ((row.status === 'pending' && canApproveLoans) || (row.status === 'approved' && canDisburseLoans))) {
      return <div className="space-y-2"><LoanDecisionButtons loanId={row.id} status={row.status as 'pending' | 'approved'} termMonths={Number(row.term_months)} canApprove={canApproveLoans} canDisburse={canDisburseLoans} onUpdated={(status) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item))} /><LoanOwnerActions loanId={row.id} status={String(row.status)} isOwn={Boolean(row.is_own)} canManage={can('loans:manage')} /></div>
    }
    if (resource === 'loans' && key === 'status' && row.status === 'approved' && row.is_own) return <LoanOwnerActions loanId={row.id} status={String(row.status)} isOwn canManage={false} />
    return key === 'amount' || key === 'principal' || key === 'outstanding_amount' || key === 'outstanding_interest' ? new Intl.NumberFormat('en-RW', { style: 'currency', currency: group?.currency ?? 'RWF', maximumFractionDigits: 0 }).format(Number(row[key] ?? 0)) : String(row[key] ?? '—')
  } }))

  if (groupsLoading) return <p className="p-8 text-sm text-slate-600">Loading your groups…</p>
  if (groupError) return <FormError message={groupError} />
  if (groups.length === 0) return <div className="mx-auto max-w-3xl p-6"><h1 className="mb-5 text-2xl font-semibold">Create your first savings group</h1><GroupForm onCreated={(created: Group) => window.location.assign(`/dashboard?group=${created.id}`)} /></div>

  return <><DashboardHeader title={config.title} description={`Manage ${config.title.toLowerCase()} for ${group?.name ?? 'your group'}.`} /><main className="mx-auto max-w-7xl space-y-5 p-5 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><label className="grid gap-1 text-xs font-medium text-slate-600">Savings group<Select value={group?.id ?? ''} onChange={(event) => { const selected = groups.find((candidate) => candidate.id === event.target.value); if (selected) setGroup(selected) }} className="min-w-56"><option value="" disabled>Choose a group</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label><div className="flex flex-wrap gap-2">{resource === 'members' && canManageRoles && <button type="button" onClick={() => setShowRolePanel((open) => !open)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{showRolePanel ? 'Close access control' : 'Manage roles'}</button>}{resource === 'members' && canManageMembers && <button type="button" onClick={() => setShowMemberForm((open) => !open)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{showMemberForm ? 'Close form' : 'Add member'}</button>}{config.createHref && canCreate && <Link href={config.createHref} className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">{resource === 'loans' ? 'Apply for a loan' : `New ${resource.slice(0, -1)}`}</Link>}</div></div>{resource === 'members' && showRolePanel && group && access && <RoleAssignmentsPanel groupId={group.id} access={access} onChanged={() => setAccessVersion((current) => current + 1)} />}{resource === 'members' && showMemberForm && group && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-semibold">Add a group member</h2><MemberForm groupId={group.id} onCreated={(member) => { setRows((current) => [...current, member]); setShowMemberForm(false) }} /></section>}<FormError message={error} />{!access ? accessError ? <FormError message={accessError} /> : <p role="status" className="py-8 text-sm text-slate-500">Loading access…</p> : !canViewResource ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">This account does not have permission to view these group records.</p> : loading ? <p role="status" className="py-8 text-sm text-slate-500">Loading records…</p> : rows.length ? <><TableFilters query={query} onQueryChange={setQuery} placeholder={`Search ${config.title.toLowerCase()}`} /><DataTable rows={filtered} rowKey="id" columns={columns} /></> : <EmptyState title={`No ${config.title.toLowerCase()} yet`} description={`Records added to ${group?.name ?? 'this group'} will appear here.`} />}{resource === 'meetings' && itemId && filtered[0] && access && <><section className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-medium text-indigo-700">{new Date(String(filtered[0].starts_at)).toLocaleString()}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{String(filtered[0].title)}</h2>{Boolean(filtered[0].location) && <p className="mt-1 text-sm text-slate-600">{String(filtered[0].location)}</p>}{Boolean(filtered[0].agenda) && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{String(filtered[0].agenda)}</p>}</section><MeetingDecisionsPanel meetingId={itemId} canManage={can('meetings:manage')} canVote={access.is_member} /></>}</main></>
}
