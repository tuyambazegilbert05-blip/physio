'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { FormError } from '@/components/forms/FormError'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { apiRequest } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/formatters'
import type { GroupAccess } from '@/types/role'
import type { BankTransaction, ContributionObligation, FinancialPeriodClosing, GroupCycle, GroupExpense, ProfitCalculation, ShareTransaction, SocialFundRequest } from '@/types/operations'
import type { Member } from '@/types/member'

type OperationsData = {
  cycles: GroupCycle[]
  shares: ShareTransaction[]
  obligations: ContributionObligation[]
  bankTransactions: BankTransaction[]
  socialRequests: SocialFundRequest[]
  expenses: GroupExpense[]
  interestCharges: { id: string; loan_id: string; period: string; amount: number; due_on: string }[]
  closings: FinancialPeriodClosing[]
  profits: ProfitCalculation[]
  corrections: unknown[]
  members: Pick<Member, 'id' | 'full_name' | 'user_id' | 'status'>[]
}

const emptyData: OperationsData = { cycles: [], shares: [], obligations: [], bankTransactions: [], socialRequests: [], expenses: [], interestCharges: [], closings: [], profits: [], corrections: [], members: [] }
const monthStart = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="font-semibold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-600">{description}</p>}</div>{children}</section>
}

function Status({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{children}</span>
}

export function OperationsPage() {
  const { group, groups, setGroup, loading: groupsLoading, error: groupsError } = useActiveGroup()
  const { user } = useAuth()
  const [data, setData] = useState<OperationsData>(emptyData)
  const [access, setAccess] = useState<GroupAccess | null>(null)
  const [month, setMonth] = useState(monthStart)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const [items, roles] = await Promise.all([
        apiRequest<OperationsData>(`/api/operations?group_id=${encodeURIComponent(group.id)}`),
        apiRequest<GroupAccess>(`/api/roles?group_id=${encodeURIComponent(group.id)}`),
      ])
      setData(items)
      setAccess(roles)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the operational records.')
    } finally {
      setLoading(false)
    }
  }, [group])

  useEffect(() => { void refresh() }, [refresh])

  const permissions = access?.permissions ?? []
  const can = (permission: string) => permissions.includes(permission)
  const ownMember = useMemo(() => data.members.find((member) => member.user_id === user?.id), [data.members, user?.id])
  const activeCycle = data.cycles.find((cycle) => cycle.status === 'open')

  async function submit(payload: Record<string, unknown>) {
    setPending(true)
    setError('')
    setMessage('')
    try {
      const result = await apiRequest<unknown>('/api/operations', { method: 'POST', body: JSON.stringify(payload) })
      setMessage(typeof result === 'number' ? `Completed. ${result} record${result === 1 ? '' : 's'} affected.` : 'Your change has been saved.')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The requested operation could not be completed.')
    } finally {
      setPending(false)
    }
  }

  function postForm(event: FormEvent<HTMLFormElement>, values: Record<string, unknown>) {
    event.preventDefault()
    void submit(values)
  }

  if (groupsLoading) return <p className="p-8 text-sm text-slate-600">Loading your groups…</p>
  if (groupsError) return <main className="p-8"><FormError message={groupsError} /></main>
  if (!group) return <main className="p-8"><h1 className="text-2xl font-semibold">Choose a savings group</h1><p className="mt-2 text-sm text-slate-600">Create or join a group to manage its financial operations.</p></main>

  return <>
    <DashboardHeader title="Operations" description={`Manage cycles, payments, social funds, expenses, and financial close for ${group.name}.`} />
    <main className="mx-auto max-w-7xl space-y-5 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="grid gap-1 text-xs font-medium text-slate-600">Savings group<Select value={group.id} onChange={(event) => { const next = groups.find((item) => item.id === event.target.value); if (next) setGroup(next) }} className="min-w-56">{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
        <button type="button" onClick={() => void refresh()} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Refresh records</button>
      </div>
      <FormError message={error} />
      {message && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {loading && <p role="status" className="text-sm text-slate-500">Loading operational records…</p>}
      {!loading && error && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The operational tables are available after migration 014 is applied to the database.</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Savings cycles" description="Configure each period, open it for contributions, then close and archive it when complete.">
          {can('cycles:manage') && <form onSubmit={(event) => {
            const form = new FormData(event.currentTarget)
            postForm(event, { action: 'create_cycle', group_id: group.id, name: form.get('name'), starts_on: form.get('starts_on'), ends_on: form.get('ends_on'), share_price: Number(form.get('share_price')), contribution_amount: Number(form.get('contribution_amount')), contribution_due_day: Number(form.get('contribution_due_day')), late_penalty: Number(form.get('late_penalty')), loan_limit: form.get('loan_limit') ? Number(form.get('loan_limit')) : null })
          }} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-slate-600">Cycle name<Input name="name" minLength={2} maxLength={120} placeholder="2026 savings cycle" required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Start date<Input name="starts_on" type="date" required /></label>
            <label className="grid gap-1 text-xs text-slate-600">End date<Input name="ends_on" type="date" required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Share price ({group.currency})<Input name="share_price" type="number" min="0" step="1" defaultValue="0" required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Monthly contribution ({group.currency})<Input name="contribution_amount" type="number" min="0" step="1" defaultValue={group.contribution_amount} required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Due day<Input name="contribution_due_day" type="number" min="1" max="28" defaultValue="5" required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Late penalty ({group.currency})<Input name="late_penalty" type="number" min="0" step="1" defaultValue="0" required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Loan limit ({group.currency})<Input name="loan_limit" type="number" min="0" step="1" /></label>
            <div className="sm:col-span-2"><FormSubmit pending={pending}>Create cycle</FormSubmit></div>
          </form>}
          <div className="space-y-2">{data.cycles.length ? data.cycles.map((cycle) => <article key={cycle.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><strong className="text-sm">{cycle.name}</strong><p className="mt-1 text-xs text-slate-500">{formatDate(cycle.starts_on)} – {formatDate(cycle.ends_on)} · {formatMoney(cycle.contribution_amount, group.currency)} / month</p></div><div className="flex items-center gap-2"><Status>{cycle.status}</Status>{can('cycles:manage') && cycle.status === 'draft' && <button disabled={pending} onClick={() => void submit({ action: 'cycle_status', group_id: group.id, cycle_id: cycle.id, status: 'open' })} className="rounded border px-3 py-1.5 text-xs">Open</button>}{can('cycles:manage') && cycle.status === 'open' && <button disabled={pending} onClick={() => void submit({ action: 'cycle_status', group_id: group.id, cycle_id: cycle.id, status: 'closing' })} className="rounded border px-3 py-1.5 text-xs">Start closing</button>}{can('cycles:manage') && cycle.status === 'closing' && <button disabled={pending} onClick={() => void submit({ action: 'cycle_status', group_id: group.id, cycle_id: cycle.id, status: 'closed' })} className="rounded border px-3 py-1.5 text-xs">Close</button>}{can('cycles:manage') && cycle.status === 'closed' && <button disabled={pending} onClick={() => void submit({ action: 'cycle_status', group_id: group.id, cycle_id: cycle.id, status: 'archived' })} className="rounded border px-3 py-1.5 text-xs">Archive</button>}</div></article>) : <p className="text-sm text-slate-500">No cycle records yet.</p>}</div>
        </Panel>

        <Panel title="Monthly contributions" description="Generate each active member’s obligation and apply configured penalties to overdue balances.">
          <label className="grid max-w-xs gap-1 text-xs text-slate-600">Contribution month<Input type="month" value={month.slice(0, 7)} onChange={(event) => setMonth(`${event.target.value}-01`)} /></label>
          {can('obligations:manage') && activeCycle && <div className="flex flex-wrap gap-2"><button disabled={pending} onClick={() => void submit({ action: 'generate_obligations', group_id: group.id, cycle_id: activeCycle.id, period: month })} className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Generate obligations</button><button disabled={pending} onClick={() => void submit({ action: 'apply_penalties', group_id: group.id, period: month })} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Apply overdue penalties</button></div>}
          {!activeCycle && <p className="text-sm text-slate-500">Open a cycle before generating contribution obligations.</p>}
          <div className="max-h-64 space-y-2 overflow-auto">{data.obligations.slice(0, 40).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm"><span>{data.members.find((member) => member.id === item.member_id)?.full_name ?? 'Member'} · {item.period.slice(0, 7)}<small className="block text-xs text-slate-500">Due {formatDate(item.due_on)}{item.penalty_amount ? ` · penalty ${formatMoney(item.penalty_amount, group.currency)}` : ''}</small></span><div className="flex items-center gap-2"><strong>{formatMoney(item.amount_due + item.penalty_amount, group.currency)}</strong><Status>{item.status}</Status></div></div>)}{!data.obligations.length && <p className="text-sm text-slate-500">No contribution obligations yet.</p>}</div>
        </Panel>

        <Panel title="Shares" description="Record share purchases or sales, review share transactions, and track net ownership by cycle.">
          {data.cycles.length > 0 && (access?.is_member || can('shares:manage')) && <form onSubmit={(event) => { const form = new FormData(event.currentTarget); postForm(event, { action: 'record_share', group_id: group.id, cycle_id: form.get('cycle_id'), member_id: can('shares:manage') ? form.get('member_id') : ownMember?.id, direction: form.get('direction'), units: Number(form.get('units')), unit_price: Number(form.get('unit_price')), reference: form.get('reference') || null }) }} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
            {can('shares:manage') && <label className="grid gap-1 text-xs text-slate-600">Member<Select name="member_id" required>{data.members.map((member) => <option value={member.id} key={member.id}>{member.full_name}</option>)}</Select></label>}
            <label className="grid gap-1 text-xs text-slate-600">Cycle<Select name="cycle_id" defaultValue={activeCycle?.id} required>{data.cycles.map((cycle) => <option value={cycle.id} key={cycle.id}>{cycle.name}</option>)}</Select></label>
            <label className="grid gap-1 text-xs text-slate-600">Transaction<Select name="direction"><option value="purchase">Purchase</option>{can('shares:manage') && <option value="sale">Sale / withdrawal</option>}</Select></label>
            <label className="grid gap-1 text-xs text-slate-600">Share units<Input name="units" type="number" min="0.01" step="0.01" required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Price per share ({group.currency})<Input name="unit_price" type="number" min="0" step="1" defaultValue={activeCycle?.share_price ?? 0} required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Payment reference<Input name="reference" maxLength={160} /></label>
            <div className="sm:col-span-2"><FormSubmit pending={pending}>Record share transaction</FormSubmit></div>
          </form>}
          <div className="max-h-56 space-y-2 overflow-auto">{data.shares.slice(0, 30).map((share) => <div key={share.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm"><span>{data.members.find((member) => member.id === share.member_id)?.full_name ?? 'Member'} · {share.units} {share.direction === 'purchase' ? 'bought' : 'sold'}<small className="block text-xs text-slate-500">{formatMoney(share.amount, group.currency)} · {formatDate(share.created_at)}</small></span><div className="flex items-center gap-2"><Status>{share.status}</Status>{can('shares:manage') && share.status === 'pending' && <><button disabled={pending} onClick={() => void submit({ action: 'verify_share', id: share.id, status: 'verified' })} className="rounded border px-2 py-1 text-xs">Verify</button><button disabled={pending} onClick={() => void submit({ action: 'verify_share', id: share.id, status: 'rejected' })} className="rounded border px-2 py-1 text-xs">Reject</button></>}</div></div>)}{!data.shares.length && <p className="text-sm text-slate-500">No share transactions yet.</p>}</div>
        </Panel>

        <Panel title="Social fund" description="Submit assistance requests and track decisions and disbursements separately from group savings.">
          {ownMember && <form onSubmit={(event) => { const form = new FormData(event.currentTarget); postForm(event, { action: 'request_social_fund', group_id: group.id, member_id: ownMember.id, amount: Number(form.get('amount')), reason: form.get('reason') }) }} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"><label className="grid gap-1 text-xs text-slate-600">Amount ({group.currency})<Input name="amount" type="number" min="1" step="1" required /></label><label className="grid gap-1 text-xs text-slate-600">Reason<Textarea name="reason" minLength={5} maxLength={2000} required /></label><div className="sm:col-span-2"><FormSubmit pending={pending}>Submit assistance request</FormSubmit></div></form>}
          <div className="max-h-56 space-y-2 overflow-auto">{data.socialRequests.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-2"><div><strong className="text-sm">{formatMoney(item.amount_requested, group.currency)} · {data.members.find((member) => member.id === item.member_id)?.full_name ?? 'Member'}</strong><p className="text-xs text-slate-500">{item.reason}</p></div><div className="flex flex-wrap items-center gap-2"><Status>{item.status}</Status>{can('social_fund:decide') && item.status === 'pending' && <><button disabled={pending} onClick={() => void submit({ action: 'decide_social_fund', id: item.id, status: 'approved' })} className="rounded border px-2 py-1 text-xs">Approve</button><button disabled={pending} onClick={() => { const decision_note = window.prompt('Reason for declining this request:'); if (decision_note?.trim()) void submit({ action: 'decide_social_fund', id: item.id, status: 'rejected', decision_note: decision_note.trim() }) }} className="rounded border px-2 py-1 text-xs">Reject</button></>}{can('social_fund:manage') && item.status === 'approved' && <button disabled={pending} onClick={() => { const reference = window.prompt('Payment reference (optional):'); if (reference !== null) void submit({ action: 'decide_social_fund', id: item.id, status: 'disbursed', reference: reference.trim() || null }) }} className="rounded border px-2 py-1 text-xs">Mark disbursed</button>}</div></article>)}{!data.socialRequests.length && <p className="text-sm text-slate-500">No assistance requests yet.</p>}</div>
        </Panel>

        <Panel title="Expenses" description="Record group, social-fund, or profit-funded expenses with approval and payment tracking.">
          {can('expenses:manage') && <form onSubmit={(event) => { const form = new FormData(event.currentTarget); postForm(event, { action: 'create_expense', group_id: group.id, cycle_id: activeCycle?.id ?? null, category: form.get('category'), description: form.get('description'), funding_source: form.get('funding_source'), amount: Number(form.get('amount')), spent_on: form.get('spent_on'), payment_method: form.get('payment_method'), reference: form.get('reference') || null }) }} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-slate-600">Category<Select name="category"><option value="operations">Operations</option><option value="meeting">Meeting</option><option value="social_fund">Social fund</option><option value="profit_distribution">Profit distribution</option><option value="other">Other</option></Select></label>
            <label className="grid gap-1 text-xs text-slate-600">Funding source<Select name="funding_source"><option value="group">Group funds</option><option value="social_fund">Social fund</option><option value="profit">Profit</option></Select></label>
            <label className="grid gap-1 text-xs text-slate-600">Amount ({group.currency})<Input name="amount" type="number" min="1" step="1" required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Expense date<Input name="spent_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
            <label className="grid gap-1 text-xs text-slate-600">Payment method<Select name="payment_method"><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile money</option><option value="other">Other</option></Select></label>
            <label className="grid gap-1 text-xs text-slate-600">Reference<Input name="reference" maxLength={160} /></label>
            <label className="grid gap-1 text-xs text-slate-600 sm:col-span-2">Description<Textarea name="description" minLength={3} maxLength={1000} required /></label>
            <div className="sm:col-span-2"><FormSubmit pending={pending}>Record expense</FormSubmit></div>
          </form>}
          <div className="max-h-56 space-y-2 overflow-auto">{data.expenses.map((expense) => <div key={expense.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2"><span className="text-sm">{expense.description}<small className="block text-xs text-slate-500">{expense.category.replace('_', ' ')} · {expense.funding_source.replace('_', ' ')} · {formatMoney(expense.amount, group.currency)}</small></span><div className="flex items-center gap-2"><Status>{expense.status}</Status>{can('expenses:approve') && expense.status === 'pending' && <button disabled={pending} onClick={() => void submit({ action: 'update_expense', id: expense.id, status: 'approved' })} className="rounded border px-2 py-1 text-xs">Approve</button>}{can('expenses:approve') && expense.status === 'pending' && <button disabled={pending} onClick={() => void submit({ action: 'update_expense', id: expense.id, status: 'rejected' })} className="rounded border px-2 py-1 text-xs">Reject</button>}{can('expenses:manage') && expense.status === 'approved' && <button disabled={pending} onClick={() => void submit({ action: 'update_expense', id: expense.id, status: 'paid' })} className="rounded border px-2 py-1 text-xs">Mark paid</button>}</div></div>)}{!data.expenses.length && <p className="text-sm text-slate-500">No expenses yet.</p>}</div>
        </Panel>

        <Panel title="Bank reconciliation" description="Capture statement entries, match them to verified ledger items, and include a reconciled month in financial close.">
          {can('payments:record') && <form onSubmit={(event) => { const form = new FormData(event.currentTarget); postForm(event, { action: 'record_bank_transaction', group_id: group.id, account_label: form.get('account_label'), transaction_date: `${form.get('transaction_date')}T12:00:00.000Z`, description: form.get('description'), amount: Number(form.get('amount')), reference: form.get('reference') }) }} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-slate-600">Account label<Input name="account_label" maxLength={120} required /></label><label className="grid gap-1 text-xs text-slate-600">Date<Input name="transaction_date" type="date" required /></label><label className="grid gap-1 text-xs text-slate-600">Signed amount ({group.currency})<Input name="amount" type="number" step="1" required /></label><label className="grid gap-1 text-xs text-slate-600">Reference<Input name="reference" maxLength={160} required /></label><label className="grid gap-1 text-xs text-slate-600 sm:col-span-2">Description<Input name="description" maxLength={500} required /></label><div className="sm:col-span-2"><FormSubmit pending={pending}>Add bank transaction</FormSubmit></div>
          </form>}
          <div className="max-h-64 space-y-3 overflow-auto">{data.bankTransactions.map((transaction) => <article key={transaction.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-2 text-sm"><span><strong>{transaction.description}</strong><small className="block text-xs text-slate-500">{transaction.reference} · {formatDate(transaction.transaction_date)}</small></span><div className="text-right"><strong>{formatMoney(transaction.amount, group.currency)}</strong><small className="block"><Status>{transaction.status}</Status></small></div></div>{can('reconciliation:manage') && transaction.status === 'unmatched' && <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { const form = new FormData(event.currentTarget); postForm(event, { action: 'reconcile_bank_transaction', id: transaction.id, entity: form.get('entity'), entity_id: form.get('entity_id') }) }}><Select name="entity"><option value="contributions">Contribution</option><option value="loan_repayments">Loan repayment</option><option value="expenses">Expense</option><option value="share_transactions">Share transaction</option></Select><Input name="entity_id" placeholder="Ledger record ID" required /><button disabled={pending} className="rounded border px-3 py-2 text-xs">Match exactly</button></form>}</article>)}{!data.bankTransactions.length && <p className="text-sm text-slate-500">No bank statement entries yet.</p>}</div>
        </Panel>

        <Panel title="Interest and monthly close" description="Calculate interest, prepare a reconciled monthly snapshot, then have a second authorized officer approve the close.">
          <label className="grid max-w-xs gap-1 text-xs text-slate-600">Financial month<Input type="month" value={month.slice(0, 7)} onChange={(event) => setMonth(`${event.target.value}-01`)} /></label>
          <div className="flex flex-wrap gap-2">{can('interest:calculate') && <button disabled={pending} onClick={() => void submit({ action: 'accrue_interest', group_id: group.id, period: month })} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Calculate monthly interest</button>}{can('closing:manage') && <button disabled={pending} onClick={() => void submit({ action: 'close_month', group_id: group.id, cycle_id: activeCycle?.id ?? null, period: month })} className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Prepare monthly close</button>}</div>
          <div className="max-h-48 space-y-2 overflow-auto">{data.closings.map((closing) => <div key={closing.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm"><span>{closing.period.slice(0, 7)}<small className="block text-xs text-slate-500">{closing.status === 'closed' ? `Closed ${closing.closed_at ? formatDate(closing.closed_at) : ''} · approved by ${closing.approved_by === user?.id ? 'you' : 'another officer'}` : `Prepared ${formatDate(closing.prepared_at)} by ${closing.prepared_by === user?.id ? 'you' : 'another officer'}`}</small></span><div className="flex items-center gap-2"><Status>{closing.status}</Status>{can('closing:manage') && closing.status === 'review' && closing.prepared_by !== user?.id && <button disabled={pending} onClick={() => void submit({ action: 'approve_month_close', closing_id: closing.id })} className="rounded border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-800">Approve close</button>}</div></div>)}{!data.closings.length && <p className="text-sm text-slate-500">No monthly closings yet.</p>}</div>
          {data.interestCharges.length > 0 && <p className="text-xs text-slate-500">Recorded interest charges: {data.interestCharges.length} · {formatMoney(data.interestCharges.reduce((sum, charge) => sum + charge.amount, 0), group.currency)}</p>}
        </Panel>

        <Panel title="Profit calculation and distribution" description="Calculate profit from verified interest receipts and paid expenses, allocate by verified share ownership, then record approval and distribution.">
          {can('profit:calculate') && data.cycles.length > 0 && <form onSubmit={(event) => { const form = new FormData(event.currentTarget); postForm(event, { action: 'calculate_profit', group_id: group.id, cycle_id: form.get('cycle_id'), period: form.get('period') || null }) }} className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4"><label className="grid gap-1 text-xs text-slate-600">Cycle<Select name="cycle_id" defaultValue={activeCycle?.id}>{data.cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</Select></label><label className="grid gap-1 text-xs text-slate-600">Optional month<Input type="month" name="period" /></label><FormSubmit pending={pending}>Calculate profit</FormSubmit></form>}
          <div className="max-h-64 space-y-3 overflow-auto">{data.profits.map((profit) => <article key={profit.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{formatMoney(profit.net_profit, group.currency)} net</strong><p className="text-xs text-slate-500">Income {formatMoney(profit.income, group.currency)} · Expenses {formatMoney(profit.expenses, group.currency)}{profit.period ? ` · ${profit.period.slice(0, 7)}` : ''}</p></div><div className="flex items-center gap-2"><Status>{profit.status}</Status>{can('profit:distribute') && profit.status === 'draft' && <button disabled={pending} onClick={() => void submit({ action: 'set_profit_status', id: profit.id, status: 'approved' })} className="rounded border px-2 py-1 text-xs">Approve formula</button>}{can('profit:distribute') && profit.status === 'approved' && <button disabled={pending} onClick={() => void submit({ action: 'set_profit_status', id: profit.id, status: 'distributed' })} className="rounded border px-2 py-1 text-xs">Record distribution</button>}</div></div><details className="mt-2 text-xs"><summary className="cursor-pointer text-indigo-700">Member allocation</summary><ul className="mt-2 space-y-1">{profit.allocations.map((allocation) => <li key={allocation.member_id}>{data.members.find((member) => member.id === allocation.member_id)?.full_name ?? 'Member'} · {allocation.units} shares · {formatMoney(allocation.amount, group.currency)}</li>)}</ul></details></article>)}{!data.profits.length && <p className="text-sm text-slate-500">No profit calculations yet.</p>}</div>
        </Panel>
      </div>
    </main>
  </>
}
