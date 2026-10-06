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
import type { GroupAccess } from '@/types/role'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { useDebounce } from '@/hooks/useDebounce'
import { apiRequest } from '@/lib/api'

const resources = {
  members: {
    title: 'Members',
    endpoint: '/api/members',
    createHref: null,
    columns: [
      ['full_name', 'Name'],
      ['email', 'Email'],
      ['phone', 'Phone'],
      ['status', 'Membership'],
    ],
  },
  contributions: {
    title: 'Contributions',
    endpoint: '/api/contributions',
    createHref: '/dashboard/contributions/new',
    columns: [
      ['period', 'Period'],
      ['contribution_type', 'Type'],
      ['amount', 'Amount'],
      ['status', 'Status'],
      ['created_at', 'Recorded'],
    ],
  },
  loans: {
    title: 'Loans',
    endpoint: '/api/loans',
    createHref: '/dashboard/loans/apply',
    columns: [
      ['principal', 'Principal'],
      ['outstanding_amount', 'Principal due'],
      ['outstanding_interest', 'Interest due'],
      ['term_months', 'Term'],
      ['purpose', 'Purpose'],
      ['status', 'Status'],
      ['due_date', 'Due date'],
    ],
  },
  meetings: {
    title: 'Meetings',
    endpoint: '/api/meetings',
    createHref: '/dashboard/meetings/new',
    columns: [
      ['title', 'Title'],
      ['starts_at', 'Starts'],
      ['location', 'Location'],
      ['agenda', 'Agenda'],
    ],
  },
} as const

type ResourceName = keyof typeof resources
type Row = Record<string, unknown> & { id: string }
const emptyRows: Row[] = []

export function DashboardModule({ resource, itemId }: { resource: ResourceName; itemId?: string }) {
  const config = resources[resource]
  const { groups, group, setGroup, loading: groupsLoading, error: groupError } = useActiveGroup()
  const [rowsState, setRowsState] = useState<{ groupId: string; rows: Row[] } | null>(null)
  const [errorState, setErrorState] = useState<{ groupId: string; message: string } | null>(null)
  const [accessErrorState, setAccessErrorState] = useState<{
    groupId: string
    message: string
  } | null>(null)
  const [query, setQuery] = useState('')
  const [accessState, setAccessState] = useState<{
    groupId: string
    access: GroupAccess | null
  } | null>(null)
  const [accessVersion, setAccessVersion] = useState(0)
  const [showRolePanel, setShowRolePanel] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const debouncedQuery = useDebounce(query)
  const rows = group && rowsState?.groupId === group.id ? rowsState.rows : emptyRows
  const loading = Boolean(group && rowsState?.groupId !== group.id)
  const error = group && errorState?.groupId === group.id ? errorState.message : ''
  const access = group && accessState?.groupId === group.id ? accessState.access : null
  const accessError = group && accessErrorState?.groupId === group.id ? accessErrorState.message : ''
  const updateRows = (update: (current: Row[]) => Row[]) => {
    if (!group) return
    setRowsState((current) => ({
      groupId: group.id,
      rows: update(current?.groupId === group.id ? current.rows : []),
    }))
  }

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<Row[]>(`${config.endpoint}?group_id=${encodeURIComponent(group.id)}`)
      .then((items) => {
        if (!active) return
        setRowsState({ groupId: group.id, rows: items })
        setErrorState(null)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setRowsState({ groupId: group.id, rows: [] })
        setErrorState({
          groupId: group.id,
          message:
            reason instanceof Error
              ? reason.message
              : `Unable to load ${config.title.toLowerCase()}.`,
        })
      })
    return () => {
      active = false
    }
  }, [config.endpoint, config.title, group])

  useEffect(() => {
    let active = true
    if (!group) return
    apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`)
      .then((snapshot) => {
        if (!active) return
        setAccessState({ groupId: group.id, access: snapshot })
        setAccessErrorState(null)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setAccessState({ groupId: group.id, access: null })
        setAccessErrorState({
          groupId: group.id,
          message:
            reason instanceof Error ? reason.message : 'Could not load access permissions.',
        })
      })
    return () => {
      active = false
    }
  }, [group, accessVersion])

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (itemId && row.id !== itemId) return false
        return Object.values(row).join(' ').toLowerCase().includes(debouncedQuery.toLowerCase())
      }),
    [rows, debouncedQuery, itemId],
  )
  const can = (permission: string) => Boolean(access?.permissions.includes(permission))
  const canVerifyContributions = can('contributions:verify')
  const canApproveLoans = can('loans:approve')
  const canDisburseLoans = can('loans:disburse')
  const canRecordRepayments = can('repayments:record')
  const canVerifyRepayments = can('repayments:verify')
  const canManageMembers = can('members:manage')
  const canManageRoles = can('roles:manage')
  const canViewResource =
      resource === 'members'
        ? access?.is_member || can('members:read')
        : resource === 'contributions'
          ? access?.is_member || can('contributions:read')
          : resource === 'loans'
            ? access?.is_member || can('loans:read')
            : access?.is_member || can('meetings:read') || can('meetings:manage')
  const canCreate =
    resource === 'contributions'
      ? access?.is_member || can('contributions:record')
      : resource === 'loans'
        ? access?.is_member
        : resource === 'meetings' && can('meetings:manage')
  const columns = config.columns.map(([key, label]) => ({
    key,
    label,
    render: (row: Row) => {
      if (resource === 'meetings' && key === 'title')
        return (
          <Link
            href={`/dashboard/meetings/${row.id}`}
            className="font-medium text-indigo-700 hover:underline"
          >
            {String(row.title ?? 'Untitled meeting')}
          </Link>
        )
      if (
        resource === 'contributions' &&
        key === 'status' &&
        canVerifyContributions &&
        row.status === 'pending'
      ) {
        return (
          <ContributionReviewButton
            id={row.id}
            onReviewed={(status) =>
              updateRows((current) =>
                current.map((item) => (item.id === row.id ? { ...item, status } : item)),
              )
            }
          />
        )
      }
      if (resource === 'members' && key === 'status' && canManageMembers && group) {
        return (
          <MemberStatusActions
            memberId={row.id}
            groupId={group.id}
            status={row.status as 'active' | 'inactive' | 'suspended'}
            onChanged={(status) =>
              updateRows((current) =>
                current.map((item) => (item.id === row.id ? { ...item, status } : item)),
              )
            }
          />
        )
      }
      if (resource === 'loans' && key === 'status' && row.is_draft && access?.is_member) {
        return (
          <LoanDraftActions
            loan={{
              id: row.id,
              principal: Number(row.principal),
              interest_rate: Number(row.interest_rate),
              term_months: Number(row.term_months),
              purpose: String(row.purpose ?? ''),
            }}
          />
        )
      }
      if (
        resource === 'loans' &&
        key === 'status' &&
        ['active', 'defaulted'].includes(String(row.status)) &&
        (row.is_own || canRecordRepayments || canVerifyRepayments || can('loans:manage'))
      ) {
        return (
          <div className="space-y-2">
            <LoanRepaymentActions
              loanId={row.id}
              currency={group?.currency ?? 'RWF'}
              canSubmit={Boolean(row.is_own) || canRecordRepayments}
              canVerify={canVerifyRepayments}
            />
            <LoanOwnerActions
              loanId={row.id}
              status={String(row.status)}
              isOwn={Boolean(row.is_own)}
              canManage={can('loans:manage')}
            />
          </div>
        )
      }
      if (
        resource === 'loans' &&
        key === 'status' &&
        ((row.status === 'pending' && canApproveLoans) ||
          (row.status === 'approved' && canDisburseLoans))
      ) {
        return (
          <div className="space-y-2">
            <LoanDecisionButtons
              loanId={row.id}
              status={row.status as 'pending' | 'approved'}
              termMonths={Number(row.term_months)}
              canApprove={canApproveLoans}
              canDisburse={canDisburseLoans}
              onUpdated={(status) =>
                updateRows((current) =>
                  current.map((item) => (item.id === row.id ? { ...item, status } : item)),
                )
              }
            />
            <LoanOwnerActions
              loanId={row.id}
              status={String(row.status)}
              isOwn={Boolean(row.is_own)}
              canManage={can('loans:manage')}
            />
          </div>
        )
      }
      if (resource === 'loans' && key === 'status' && row.status === 'approved' && row.is_own)
        return (
          <LoanOwnerActions loanId={row.id} status={String(row.status)} isOwn canManage={false} />
        )
      return key === 'amount' ||
        key === 'principal' ||
        key === 'outstanding_amount' ||
        key === 'outstanding_interest'
        ? new Intl.NumberFormat('en-RW', {
            style: 'currency',
            currency: group?.currency ?? 'RWF',
            maximumFractionDigits: 0,
          }).format(Number(row[key] ?? 0))
        : String(row[key] ?? '—')
    },
  }))

  if (groupsLoading) return <p className="p-8 text-sm text-slate-600">Loading your groups…</p>
  if (groupError) return <FormError message={groupError} />
  if (groups.length === 0)
    return (
      <div className="mx-auto max-w-4xl p-5 sm:p-8">
        <section className="rounded-[30px] border border-white bg-white/90 p-6 shadow-[0_24px_64px_-36px_rgba(36,55,245,0.4)] backdrop-blur-xl sm:p-9">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7B3FF2]">
            Start your workspace
          </p>
          <h1 className="mb-5 font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
            Create your first savings group
          </h1>
          <GroupForm />
        </section>
      </div>
    )

  return (
    <>
      <DashboardHeader
        title={config.title}
        description={`Manage ${config.title.toLowerCase()} for ${group?.name ?? 'your group'}.`}
      />
      <main className="mx-auto w-full max-w-[1500px] space-y-6 p-5 sm:space-y-8 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
            Active group
            <Select
              value={group?.id ?? ''}
              onChange={(event) => {
                const selected = groups.find((candidate) => candidate.id === event.target.value)
                if (selected) setGroup(selected)
              }}
              className="min-w-56"
            >
              <option value="" disabled>
                Choose a group
              </option>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap gap-2">
            {resource === 'members' && canManageRoles && (
              <button
                type="button"
                onClick={() => setShowRolePanel((open) => !open)}
                className="rounded-xl border border-indigo-100 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-indigo-50/60"
              >
                {showRolePanel ? 'Close access control' : 'Manage roles'}
              </button>
            )}
            {resource === 'members' && canManageMembers && (
              <button
                type="button"
                onClick={() => setShowMemberForm((open) => !open)}
                className="rounded-xl border border-indigo-100 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-indigo-50/60"
              >
                {showMemberForm ? 'Close form' : 'Add member'}
              </button>
            )}
            {config.createHref && canCreate && (
              <Link
                href={config.createHref}
                className="rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_-12px_rgba(83,55,220,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-12px_rgba(83,55,220,0.9)]"
              >
                {resource === 'loans' ? 'Apply for a loan' : `New ${resource.slice(0, -1)}`}
              </Link>
            )}
          </div>
        </div>
        {resource === 'members' && showRolePanel && group && access && (
          <RoleAssignmentsPanel
            groupId={group.id}
            access={access}
            onChanged={() => setAccessVersion((current) => current + 1)}
          />
        )}
        {resource === 'members' && showMemberForm && group && (
          <section className="rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.45)] backdrop-blur-xl sm:p-6">
            <h2 className="mb-4 font-heading text-lg font-extrabold tracking-tight text-[#081233]">
              Add a group member
            </h2>
            <MemberForm
              groupId={group.id}
              onCreated={(member) => {
                updateRows((current) => [...current, member])
                setShowMemberForm(false)
              }}
            />
          </section>
        )}
        <FormError message={error} />
        {!access ? (
          accessError ? (
            <FormError message={accessError} />
          ) : (
            <p role="status" className="py-8 text-sm text-slate-500">
              Loading access…
            </p>
          )
        ) : !canViewResource ? (
          <p className="rounded-[22px] border border-indigo-100 bg-white/85 p-5 text-sm leading-relaxed text-slate-600 shadow-sm">
            This account does not have permission to view these group records.
          </p>
        ) : loading ? (
          <p role="status" className="py-8 text-sm text-slate-500">
            Loading records…
          </p>
        ) : rows.length ? (
          <>
            <TableFilters
              query={query}
              onQueryChange={setQuery}
              placeholder={`Search ${config.title.toLowerCase()}`}
            />
            <DataTable rows={filtered} rowKey="id" columns={columns} />
          </>
        ) : (
          <EmptyState
            title={`No ${config.title.toLowerCase()} yet`}
            description={`Records added to ${group?.name ?? 'this group'} will appear here.`}
          />
        )}
        {resource === 'meetings' && itemId && filtered[0] && access && (
          <>
            <section className="rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.45)] backdrop-blur-xl sm:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7B3FF2]">
                {new Date(String(filtered[0].starts_at)).toLocaleString()}
              </p>
              <h2 className="mt-2 font-heading text-xl font-extrabold tracking-tight text-[#081233]">
                {String(filtered[0].title)}
              </h2>
              {Boolean(filtered[0].location) && (
                <p className="mt-1 text-sm text-slate-600">{String(filtered[0].location)}</p>
              )}
              {Boolean(filtered[0].agenda) && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                  {String(filtered[0].agenda)}
                </p>
              )}
            </section>
            <MeetingDecisionsPanel
              meetingId={itemId}
              canManage={can('meetings:manage')}
              canVote={access.is_member}
            />
          </>
        )}
      </main>
    </>
  )
}
