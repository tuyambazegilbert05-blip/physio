'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, ChevronDown, ClipboardCheck, LayoutDashboard, UsersRound, Wrench } from 'lucide-react'
import {
  canManageSystemControls,
  canViewTechnicalDiagnostics,
  administrativeWorkspacePath,
  financialWorkspacePath,
  governanceWorkspacePath,
  hasAnyPermission,
  hasGroupWorkspaceAccess,
} from '@/lib/group-workspace-access'
import { useDashboardNavigation } from '@/components/layout/useDashboardNavigation'

type Navigation = ReturnType<typeof useDashboardNavigation>

export function WorkspaceControls({
  navigation,
  onNavigate,
}: {
  navigation: Navigation
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { group, groups, setGroup, accessByGroup, workspaceGroups, loading } = navigation

  function goToGroup(groupId: string) {
    const selected = groups.find((candidate) => candidate.id === groupId)
    if (!selected) return
    setGroup(selected)
    const snapshot = accessByGroup[groupId]
    const canManage = hasGroupWorkspaceAccess(snapshot?.permissions)
    const canUseSystem = canManageSystemControls(snapshot?.permissions)
    const canUseDiagnostics = canViewTechnicalDiagnostics(snapshot?.permissions)
    const canUseRoles = hasAnyPermission(snapshot?.permissions, 'roles:read', 'roles:manage')
    const canManageOnboarding = hasAnyPermission(snapshot?.permissions, 'groups:manage', 'onboarding:manage')
    const financePath = financialWorkspacePath(snapshot?.permissions)
    const governancePath = governanceWorkspacePath(snapshot?.permissions)
    const administrationPath = administrativeWorkspacePath(snapshot?.permissions)
    const prefersDiagnostics = pathname.startsWith('/dashboard/technical-support')
    const prefersSystem = pathname.startsWith('/dashboard/system')
    const prefersRoles = pathname.startsWith('/dashboard/roles')
    const prefersFinance = [
      '/dashboard/operations',
      '/dashboard/savings',
      '/dashboard/contributions',
      '/dashboard/loans',
      '/dashboard/reports',
    ].some((route) => pathname.startsWith(route))
    const prefersGovernance = [
      '/dashboard/meetings',
      '/dashboard/announcements',
      '/dashboard/communications',
    ].some((route) => pathname.startsWith(route))
    const prefersAdministration = [
      '/dashboard/members',
      '/dashboard/invitations',
      '/dashboard/membership-requests',
      '/dashboard/group-settings',
    ].some((route) => pathname.startsWith(route))
    const prefersOnboardingSetup = pathname.startsWith('/dashboard/onboarding-settings')
    const prefersManage =
      pathname.startsWith('/dashboard/workspace') ||
      [
        '/dashboard/members',
        '/dashboard/invitations',
        '/dashboard/membership-requests',
        '/dashboard/contributions',
        '/dashboard/savings',
        '/dashboard/loans',
        '/dashboard/operations',
        '/dashboard/meetings',
        '/dashboard/reports',
        '/dashboard/audit',
        '/dashboard/communications',
        '/dashboard/announcements',
        '/dashboard/group-settings',
      ].some((route) => pathname.startsWith(route))
    const groupHref = (path: string) => `${path}?group=${encodeURIComponent(groupId)}`
    let destination = groupHref('/dashboard/workspace')
    if (prefersOnboardingSetup && canManageOnboarding) destination = groupHref('/dashboard/onboarding-settings')
    else if (prefersRoles && canUseRoles) destination = groupHref('/dashboard/roles')
    else if (prefersDiagnostics && canUseDiagnostics) {
      destination = groupHref('/dashboard/technical-support')
    } else if (prefersSystem && canUseSystem) destination = groupHref('/dashboard/system')
    else if (prefersFinance && financePath) destination = groupHref(financePath)
    else if (prefersGovernance && governancePath) destination = groupHref(governancePath)
    else if (prefersAdministration && administrationPath)
      destination = groupHref(administrationPath)
    else if (prefersManage && canManage) destination = groupHref('/dashboard/workspace')
    else if (snapshot?.is_member) destination = groupHref('/dashboard')
    else if (canUseSystem) destination = groupHref('/dashboard/system')
    else if (canUseDiagnostics) destination = groupHref('/dashboard/technical-support')
    else if (canUseRoles) destination = groupHref('/dashboard/roles')
    router.push(destination)
    onNavigate?.()
  }

  const memberGroup = group && accessByGroup[group.id]?.is_member ? group : null
  const currentCanManage = Boolean(
    group && hasGroupWorkspaceAccess(accessByGroup[group.id]?.permissions),
  )
  const manageGroup = currentCanManage ? group : (workspaceGroups[0] ?? null)
  const memberGroups = groups.filter((candidate) => accessByGroup[candidate.id]?.is_member)
  const mySpaceGroup = memberGroup ?? memberGroups[0] ?? null
  const mySpaceHref = mySpaceGroup
    ? `/dashboard?group=${encodeURIComponent(mySpaceGroup.id)}`
    : null
  const manageHref = manageGroup
    ? `/dashboard/workspace?group=${encodeURIComponent(manageGroup.id)}`
    : null
  const financeGroups = groups.filter((candidate) =>
    financialWorkspacePath(accessByGroup[candidate.id]?.permissions),
  )
  const financeGroup =
    group && financeGroups.some(({ id }) => id === group.id) ? group : (financeGroups[0] ?? null)
  const financePath = financeGroup
    ? financialWorkspacePath(accessByGroup[financeGroup.id]?.permissions)
    : null
  const financeHref =
    financeGroup && financePath
      ? `${financePath}?group=${encodeURIComponent(financeGroup.id)}`
      : null
  const governanceGroups = groups.filter((candidate) =>
    governanceWorkspacePath(accessByGroup[candidate.id]?.permissions),
  )
  const governanceGroup =
    group && governanceGroups.some(({ id }) => id === group.id)
      ? group
      : (governanceGroups[0] ?? null)
  const governancePath = governanceGroup
    ? governanceWorkspacePath(accessByGroup[governanceGroup.id]?.permissions)
    : null
  const governanceHref =
    governanceGroup && governancePath
      ? `${governancePath}?group=${encodeURIComponent(governanceGroup.id)}`
      : null
  const administrationGroups = groups.filter((candidate) =>
    administrativeWorkspacePath(accessByGroup[candidate.id]?.permissions),
  )
  const administrationGroup =
    group && administrationGroups.some(({ id }) => id === group.id)
      ? group
      : (administrationGroups[0] ?? null)
  const administrationPath = administrationGroup
    ? administrativeWorkspacePath(accessByGroup[administrationGroup.id]?.permissions)
    : null
  const administrationHref =
    administrationGroup && administrationPath
      ? `${administrationPath}?group=${encodeURIComponent(administrationGroup.id)}`
      : null
  const diagnosticGroups = groups.filter((candidate) =>
    canViewTechnicalDiagnostics(accessByGroup[candidate.id]?.permissions),
  )
  const diagnosticGroup =
    group && diagnosticGroups.some(({ id }) => id === group.id)
      ? group
      : (diagnosticGroups[0] ?? null)
  const diagnosticsHref = diagnosticGroup
    ? `/dashboard/technical-support?group=${encodeURIComponent(diagnosticGroup.id)}`
    : null
  const systemGroups = groups.filter((candidate) =>
    canManageSystemControls(accessByGroup[candidate.id]?.permissions),
  )
  const systemGroup =
    group && systemGroups.some(({ id }) => id === group.id) ? group : (systemGroups[0] ?? null)
  const systemHref = systemGroup
    ? `/dashboard/system?group=${encodeURIComponent(systemGroup.id)}`
    : null
  const accessGroups = groups.filter((candidate) =>
    hasAnyPermission(accessByGroup[candidate.id]?.permissions, 'roles:read', 'roles:manage'),
  )
  const accessGroup =
    group && accessGroups.some(({ id }) => id === group.id) ? group : (accessGroups[0] ?? null)
  const accessHref = accessGroup
    ? `/dashboard/roles?group=${encodeURIComponent(accessGroup.id)}`
    : null
  const onboardingGroups = groups.filter((candidate) =>
    hasAnyPermission(accessByGroup[candidate.id]?.permissions, 'groups:manage', 'onboarding:manage'),
  )
  const onboardingGroup =
    group && onboardingGroups.some(({ id }) => id === group.id) ? group : (onboardingGroups[0] ?? null)
  const onboardingHref = onboardingGroup
    ? `/dashboard/onboarding-settings?group=${encodeURIComponent(onboardingGroup.id)}`
    : null
  const workspaceHrefs = [
    mySpaceHref,
    manageHref,
    financeHref,
    governanceHref,
    administrationHref,
    diagnosticsHref,
    systemHref,
    accessHref,
    onboardingHref,
  ].filter(Boolean)

  return (
    <section
      aria-label="Ikimina workspace"
      className="rounded-2xl border border-indigo-100/80 bg-white/80 p-3 shadow-sm"
    >
      <label
        className="block text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400"
        htmlFor="active-ikimina"
      >
        Active Ikimina
      </label>
      <div className="relative mt-1.5">
        <select
          id="active-ikimina"
          value={group?.id ?? ''}
          disabled={loading || groups.length === 0}
          onChange={(event) => goToGroup(event.target.value)}
          className="w-full appearance-none truncate rounded-xl border border-indigo-100 bg-white px-3 py-2.5 pr-8 text-xs font-bold text-[#081233] outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
        >
          {groups.length === 0 && (
            <option value="">{loading ? 'Loading groups…' : 'No group available'}</option>
          )}
          {groups.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-600" />
      </div>

      {workspaceHrefs.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {mySpaceHref && (
            <Link
              href={mySpaceHref}
              onClick={() => {
                if (mySpaceGroup) setGroup(mySpaceGroup)
                onNavigate?.()
              }}
              aria-current={pathname === '/dashboard' ? 'page' : undefined}
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${pathname === '/dashboard' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'}`}
            >
              <UsersRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">My space</span>
            </Link>
          )}
          {manageHref && (
            <Link
              href={manageHref}
              onClick={() => {
                if (manageGroup) setGroup(manageGroup)
                onNavigate?.()
              }}
              aria-current={pathname.startsWith('/dashboard/workspace') ? 'page' : undefined}
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${pathname.startsWith('/dashboard/workspace') ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-800 hover:bg-violet-100'}`}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Manage Ikimina</span>
            </Link>
          )}
          {financeHref && (
            <Link
              href={financeHref}
              onClick={() => {
                if (financeGroup) setGroup(financeGroup)
                onNavigate?.()
              }}
              aria-current={
                [
                  '/dashboard/savings',
                  '/dashboard/operations',
                  '/dashboard/contributions',
                  '/dashboard/loans',
                  '/dashboard/reports',
                ].some((route) => pathname.startsWith(route))
                  ? 'page'
                  : undefined
              }
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${['/dashboard/savings', '/dashboard/operations', '/dashboard/contributions', '/dashboard/loans', '/dashboard/reports'].some((route) => pathname.startsWith(route)) ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Finance</span>
            </Link>
          )}
          {governanceHref && (
            <Link
              href={governanceHref}
              onClick={() => {
                if (governanceGroup) setGroup(governanceGroup)
                onNavigate?.()
              }}
              aria-current={
                [
                  '/dashboard/meetings',
                  '/dashboard/announcements',
                  '/dashboard/communications',
                ].some((route) => pathname.startsWith(route))
                  ? 'page'
                  : undefined
              }
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${['/dashboard/meetings', '/dashboard/announcements', '/dashboard/communications'].some((route) => pathname.startsWith(route)) ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'}`}
            >
              <UsersRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Governance</span>
            </Link>
          )}
          {administrationHref && (
            <Link
              href={administrationHref}
              onClick={() => {
                if (administrationGroup) setGroup(administrationGroup)
                onNavigate?.()
              }}
              aria-current={
                [
                  '/dashboard/members',
                  '/dashboard/invitations',
                  '/dashboard/membership-requests',
                  '/dashboard/group-settings',
                ].some((route) => pathname.startsWith(route))
                  ? 'page'
                  : undefined
              }
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${['/dashboard/members', '/dashboard/invitations', '/dashboard/membership-requests', '/dashboard/group-settings'].some((route) => pathname.startsWith(route)) ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-900 hover:bg-sky-100'}`}
            >
              <UsersRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Administration</span>
            </Link>
          )}
          {systemHref && (
            <Link
              href={systemHref}
              onClick={() => {
                if (systemGroup) setGroup(systemGroup)
                onNavigate?.()
              }}
              aria-current={pathname.startsWith('/dashboard/system') ? 'page' : undefined}
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${pathname.startsWith('/dashboard/system') ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">System</span>
            </Link>
          )}
          {diagnosticsHref && (
            <Link
              href={diagnosticsHref}
              onClick={() => {
                if (diagnosticGroup) setGroup(diagnosticGroup)
                onNavigate?.()
              }}
              aria-current={
                pathname.startsWith('/dashboard/technical-support') ? 'page' : undefined
              }
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${pathname.startsWith('/dashboard/technical-support') ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Wrench className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Technical support</span>
            </Link>
          )}
          {accessHref && (
            <Link
              href={accessHref}
              onClick={() => {
                if (accessGroup) setGroup(accessGroup)
                onNavigate?.()
              }}
              aria-current={pathname.startsWith('/dashboard/roles') ? 'page' : undefined}
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${pathname.startsWith('/dashboard/roles') ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <UsersRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Role access</span>
            </Link>
          )}
          {onboardingHref && (
            <Link
              href={onboardingHref}
              onClick={() => {
                if (onboardingGroup) setGroup(onboardingGroup)
                onNavigate?.()
              }}
              aria-current={pathname.startsWith('/dashboard/onboarding-settings') ? 'page' : undefined}
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition ${pathname.startsWith('/dashboard/onboarding-settings') ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-800 hover:bg-violet-100'}`}
            >
              <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Member setup</span>
            </Link>
          )}
        </div>
      )}
      {!loading && groups.length === 0 && (
        <Link
          href="/dashboard/join"
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-violet-700"
        >
          <LayoutDashboard className="h-3.5 w-3.5" /> Find an Ikimina
        </Link>
      )}
    </section>
  )
}
