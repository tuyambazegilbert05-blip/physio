import Link from 'next/link'
import {
  TrendingUp,
  PiggyBank,
  HandCoins,
  Users,
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Receipt,
  HeartHandshake,
  Percent,
} from 'lucide-react'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { Alert } from '@/components/feedback/Alert'
import { ContributionChart } from '@/components/charts/ContributionChart'
import { ContributionTable } from '@/features/contributions/components/ContributionTable'
import { LoanTable } from '@/features/loans/components/LoanTable'
import { GroupForm } from '@/features/groups/components/GroupForm'
import { GroupSelector } from './GroupSelector'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/formatters'
import type { Contribution } from '@/types/contribution'
import type { Loan } from '@/types/loan'
import { groupRoles, roleLabels, type GroupRole } from '@/types/role'

function Metric({
  label,
  amount,
  currency,
  icon: Icon,
  accent = 'blue',
}: {
  label: string
  amount: number
  currency: string
  icon?: React.ComponentType<{ className?: string }>
  accent?: 'blue' | 'purple' | 'cyan' | 'emerald' | 'amber'
}) {
  const accentStyles = {
    blue: 'bg-blue-50 text-[#2437F5]',
    purple: 'bg-purple-50 text-[#7B3FF2]',
    cyan: 'bg-cyan-50 text-[#1FB8F0]',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }[accent]

  return (
    <article className="group relative rounded-[22px] border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_10px_30px_-10px_rgba(36,55,245,0.06),0_0_0_1px_rgba(36,55,245,0.03)] hover:shadow-blue-tint transition-all duration-300">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
          {label}
        </p>
        {Icon && (
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${accentStyles} transition-transform group-hover:scale-110`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-3 font-heading text-2xl sm:text-[26px] font-extrabold text-[#081233] tracking-tight">
        {formatMoney(amount, currency)}
      </p>
    </article>
  )
}

export async function DashboardHome({ groupId }: { groupId?: string }) {
  const supabase = await createClient()
  const [{ data: userData }, groupsResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('groups')
      .select(
        'id,name,currency,contribution_amount,contribution_frequency,created_by,created_at,updated_at'
      )
      .order('created_at', { ascending: true }),
  ])
  if (groupsResult.error) throw groupsResult.error
  const group =
    groupsResult.data.find((item) => item.id === groupId) ??
    groupsResult.data[0] ??
    null
  if (!group)
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-8">
        <div className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-blue-tint">
          <h1 className="font-heading text-2xl font-extrabold text-[#081233]">
            Create your first savings group
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-sans">
            Set the group name and contribution plan. You’ll become its chairperson.
          </p>
          <div className="mt-6">
            <GroupForm />
          </div>
        </div>
      </main>
    )

  const [rolesResult, permissionsResult, memberResult, accessProfileResult] =
    await Promise.all([
      supabase.rpc('current_group_roles', { target_group: group.id }),
      supabase.rpc('current_group_permissions', { target_group: group.id }),
      supabase
        .from('members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', userData.user?.id ?? '')
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userData.user?.id ?? '')
        .maybeSingle(),
    ])
  for (const result of [
    rolesResult,
    permissionsResult,
    memberResult,
    accessProfileResult,
  ])
    if (result.error) throw result.error
  const roles = (rolesResult.data ?? []).filter((role): role is GroupRole =>
    groupRoles.includes(role as GroupRole)
  )
  const canSeeGroupFinances =
    permissionsResult.data?.includes('financial:read') ?? false
  const fullName =
    accessProfileResult.data?.full_name ?? userData.user?.email ?? 'Group user'

  if (!canSeeGroupFinances) {
    if (!memberResult.data)
      return (
        <>
          <DashboardHeader
            title={`Good day, ${fullName}`}
            description={`${group.name} · Assigned access`}
          />
          <main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
            <section className="rounded-[24px] border border-slate-100 bg-white p-6 sm:p-8 shadow-blue-tint">
              <h2 className="font-heading text-xl font-bold text-[#081233]">
                Your assigned access
              </h2>
              <p className="mt-2 text-sm text-slate-500 font-sans">
                This account is not an Ikimina member. Your available functions follow
                the roles assigned to this account.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-[#2437F5]"
                  >
                    {roleLabels[role]}
                  </span>
                ))}
              </div>
            </section>
          </main>
        </>
      )
    const [personalContributionsResult, personalLoansResult] = await Promise.all([
      supabase
        .from('contributions')
        .select('amount,status,contribution_type')
        .eq('group_id', group.id),
      supabase
        .from('loans')
        .select('outstanding_amount,status')
        .eq('group_id', group.id),
    ])
    for (const result of [personalContributionsResult, personalLoansResult])
      if (result.error) throw result.error
    const personalContributions = personalContributionsResult.data ?? []
    const personalLoans = personalLoansResult.data ?? []
    const verified = personalContributions
      .filter(
        (item) =>
          item.status === 'verified' && item.contribution_type !== 'social'
      )
      .reduce((total, item) => total + item.amount, 0)
    const balance = personalLoans
      .filter(
        (item) =>
          item.status === 'active' ||
          item.status === 'approved' ||
          item.status === 'defaulted'
      )
      .reduce((total, item) => total + item.outstanding_amount, 0)
    return (
      <>
        <DashboardHeader
          title={`Good day, ${fullName}`}
          description={`${group.name} · Your account`}
        />
        <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
          <section className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Personal overview
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#081233] tracking-tight">
              Your Phyaio Cycle activity
            </h2>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <Metric
              label="Verified savings contributions"
              amount={verified}
              currency={group.currency}
              icon={PiggyBank}
              accent="blue"
            />
            <Metric
              label="Outstanding loan balance"
              amount={balance}
              currency={group.currency}
              icon={HandCoins}
              accent="purple"
            />
          </section>
          <p className="text-xs text-slate-500 font-sans">
            Group-wide financial summaries and other members’ records require an
            assigned oversight or financial role.
          </p>
        </main>
      </>
    )
  }

  const [
    summaryResult,
    contributionsResult,
    loansResult,
    membersResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from('savings_summary')
      .select('*')
      .eq('group_id', group.id)
      .single(),
    supabase
      .from('contributions')
      .select('*')
      .eq('group_id', group.id)
      .order('period', { ascending: false })
      .limit(8),
    supabase
      .from('loans')
      .select('*')
      .eq('group_id', group.id)
      .in('status', ['pending', 'approved', 'active', 'defaulted'])
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group.id)
      .eq('status', 'active'),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userData.user?.id ?? '')
      .maybeSingle(),
  ])
  for (const result of [
    summaryResult,
    contributionsResult,
    loansResult,
    membersResult,
    profileResult,
  ])
    if (result.error) throw result.error
  const summary = summaryResult.data ?? {
    group_id: group.id,
    currency: group.currency,
    total_contributions: 0,
    total_loans_outstanding: 0,
    reserve_balance: 0,
    available_balance: 0,
    as_of: new Date().toISOString(),
    interest_collected: 0,
    group_expenses: 0,
    social_fund_balance: 0,
    share_value: 0,
  }
  const contributions = (contributionsResult.data ?? []) as Contribution[]
  const loans = (loansResult.data ?? []) as Loan[]
  const monthly = new Map<string, number>()
  for (const item of contributions)
    if (item.status === 'verified')
      monthly.set(
        item.period.slice(0, 7),
        (monthly.get(item.period.slice(0, 7)) ?? 0) + item.amount
      )
  const chart = [...monthly.entries()]
    .slice(0, 6)
    .reverse()
    .map(([month, collected]) => ({ month: month.slice(5), collected }))
  const dashboardName =
    profileResult.data?.full_name ?? userData.user?.email ?? 'Member'

  return (
    <>
      <DashboardHeader
        title={`Good day, ${dashboardName}`}
        description={`${group.name} · ${group.contribution_frequency} contributions`}
      />
      <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
        {/* Group Header & Active Cycle Tag */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#2437F5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2DE1B9] animate-pulse" />
                Active Cycle
              </span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#081233] tracking-tight">
              {group.name}
            </h2>
          </div>
          <GroupSelector groups={groupsResult.data} currentId={group.id} />
        </div>

        {/* Security & Verification Banner */}
        <div className="rounded-2xl border border-indigo-100/80 bg-white/80 backdrop-blur-md p-4 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2437F5]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#081233]">
                Server-Verified Ledger
              </p>
              <p className="text-xs text-slate-500 font-sans">
                Only confirmed deposits and approved loan issuances are computed into the live pool.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            256-Bit Encrypted
          </span>
        </div>

        {/* Metrics Grid */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Collected contributions"
            amount={summary.total_contributions}
            currency={group.currency}
            icon={PiggyBank}
            accent="blue"
          />
          <Metric
            label="Loans outstanding"
            amount={summary.total_loans_outstanding}
            currency={group.currency}
            icon={HandCoins}
            accent="purple"
          />
          <Metric
            label="Interest collected"
            amount={summary.interest_collected}
            currency={group.currency}
            icon={Percent}
            accent="cyan"
          />
          <Metric
            label="Group expenses"
            amount={summary.group_expenses}
            currency={group.currency}
            icon={Receipt}
            accent="amber"
          />
          <Metric
            label="Social fund balance"
            amount={summary.social_fund_balance}
            currency={group.currency}
            icon={HeartHandshake}
            accent="purple"
          />
          <Metric
            label="Share value"
            amount={summary.share_value}
            currency={group.currency}
            icon={TrendingUp}
            accent="blue"
          />
          <Metric
            label="Available balance"
            amount={summary.available_balance}
            currency={group.currency}
            icon={Wallet}
            accent="emerald"
          />
          <article className="group relative rounded-[22px] border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_10px_30px_-10px_rgba(36,55,245,0.06),0_0_0_1px_rgba(36,55,245,0.03)] hover:shadow-blue-tint transition-all duration-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
                Active members
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#2437F5] transition-transform group-hover:scale-110">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 font-heading text-2xl sm:text-[26px] font-extrabold text-[#081233] tracking-tight">
              {membersResult.count ?? 0}
            </p>
          </article>
        </section>

        {/* Charts and Tables */}
        <section className="grid gap-6 xl:grid-cols-2">
          {/* Contribution Activity Chart Card */}
          <article className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-blue-tint">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg text-[#081233]">
                  Contribution activity
                </h3>
                <p className="text-xs text-slate-400 font-medium">Monthly collection volume</p>
              </div>
              <Link
                href="/dashboard/contributions"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2437F5] hover:text-[#7B3FF2] transition-colors"
              >
                <span>All contributions</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {chart.length ? (
              <ContributionChart values={chart} />
            ) : (
              <p className="py-12 text-center text-sm text-slate-400">
                Verified collections will appear here.
              </p>
            )}
          </article>

          {/* Loans Requiring Attention Card */}
          <article className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-blue-tint">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg text-[#081233]">
                  Loans requiring attention
                </h3>
                <p className="text-xs text-slate-400 font-medium">Open & pending approvals</p>
              </div>
              <Link
                href="/dashboard/loans"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2437F5] hover:text-[#7B3FF2] transition-colors"
              >
                <span>All loans</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {loans.length ? (
              <LoanTable loans={loans.slice(0, 4)} currency={group.currency} />
            ) : (
              <p className="py-12 text-center text-sm text-slate-400">
                There are no open loans.
              </p>
            )}
          </article>
        </section>

        {/* Recent Contributions Table Card */}
        <section className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-blue-tint">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg text-[#081233]">
                Recent contributions
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Latest member transactions
              </p>
            </div>
            <Link
              href="/dashboard/contributions"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2437F5] hover:text-[#7B3FF2] transition-colors"
            >
              <span>View all records</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ContributionTable contributions={contributions} currency={group.currency} />
        </section>
      </main>
    </>
  )
}
