'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Activity,
  Bell,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileText,
  HandCoins,
  LayoutDashboard,
  MailPlus,
  MessageCircle,
  PiggyBank,
  ReceiptText,
  Settings2,
  SlidersHorizontal,
  Users,
  Wallet,
  WalletCards,
  Wrench,
} from 'lucide-react'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'
import {
  canManageSystemControls,
  canViewTechnicalDiagnostics,
  hasAnyPermission,
  hasGroupWorkspaceAccess,
} from '@/lib/group-workspace-access'
import type { GroupAccess } from '@/types/role'

export type DashboardLink = {
  label: string
  href: string
  icon: typeof LayoutDashboard
}

export type DashboardLinkSection = {
  label: string
  links: DashboardLink[]
}

export const personalLinks: DashboardLink[] = [
  { label: 'My overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My savings & shares', href: '/dashboard/my/savings', icon: Wallet },
  { label: 'My contributions', href: '/dashboard/my/contributions', icon: ReceiptText },
  { label: 'My loans & repayments', href: '/dashboard/my/loans', icon: HandCoins },
  { label: 'My statements', href: '/dashboard/my/statements', icon: WalletCards },
  { label: 'My communications', href: '/dashboard/my/communications', icon: MessageCircle },
]

const technicalPermissions = [
  'system:configure',
  'system:maintenance',
  'system:lock',
  'system:modules',
  'system:monitor',
  'support:manage',
  'security:manage',
  'security:audit',
] as const

const operationalPermissions = [
  'cycles:read',
  'cycles:manage',
  'obligations:read',
  'obligations:manage',
  'payments:read',
  'payments:record',
  'payments:verify',
  'reconciliation:manage',
  'expenses:read',
  'expenses:manage',
  'expenses:approve',
  'social_fund:read',
  'social_fund:manage',
  'social_fund:decide',
  'shares:read',
  'shares:manage',
  'interest:read',
  'interest:calculate',
  'closing:read',
  'closing:manage',
  'profit:calculate',
  'profit:distribute',
  'corrections:request',
  'corrections:approve',
] as const

export function useDashboardNavigation() {
  const { groups, group, setGroup, loading: groupLoading } = useActiveGroup()
  const searchParams = useSearchParams()
  const requestedGroupId = searchParams.get('group')
  const [accessState, setAccessState] = useState<{
    groupIds: string
    snapshots: Record<string, GroupAccess | null>
  } | null>(null)
  const groupIds = groups.map(({ id }) => id).join(',')

  useEffect(() => {
    if (!requestedGroupId) return
    const requested = groups.find((candidate) => candidate.id === requestedGroupId)
    if (requested && requested.id !== group?.id) setGroup(requested)
  }, [group?.id, groups, requestedGroupId, setGroup])

  useEffect(() => {
    let active = true
    if (!groupIds) return
    const candidates = groupIds.split(',')
    Promise.all(
      candidates.map(async (groupId) => {
        try {
          const snapshot = await apiRequest<GroupAccess>(
            `/api/roles?group_id=${encodeURIComponent(groupId)}`,
          )
          return [groupId, snapshot] as const
        } catch {
          return [groupId, null] as const
        }
      }),
    ).then((entries) => {
      if (active) setAccessState({ groupIds, snapshots: Object.fromEntries(entries) })
    })
    return () => {
      active = false
    }
  }, [groupIds])

  const accessByGroup = accessState?.groupIds === groupIds ? accessState.snapshots : {}
  const access = group ? (accessByGroup[group.id] ?? null) : null
  const accessLoading = Boolean(group && !Object.hasOwn(accessByGroup, group.id))
  const workspaceGroups = groups.filter((candidate) =>
    hasGroupWorkspaceAccess(accessByGroup[candidate.id]?.permissions),
  )
  const technicalGroups = groups.filter((candidate) =>
    hasAnyPermission(accessByGroup[candidate.id]?.permissions, ...technicalPermissions),
  )
  const availableGroups = groups.filter((candidate) => {
    const candidateAccess = accessByGroup[candidate.id]
    return (
      candidateAccess?.is_member ||
      hasGroupWorkspaceAccess(candidateAccess?.permissions) ||
      hasAnyPermission(
        candidateAccess?.permissions,
        ...technicalPermissions,
        'roles:read',
        'roles:manage',
      )
    )
  })

  const sections = useMemo<DashboardLinkSection[]>(() => {
    const permissions = access?.permissions ?? []
    const can = (...keys: string[]) => hasAnyPermission(permissions, ...keys)
    const next: DashboardLinkSection[] = []
    if (access?.is_member) next.push({ label: 'My space', links: personalLinks })

    const workspaceLinks: DashboardLink[] = []
    if (hasGroupWorkspaceAccess(permissions)) {
      workspaceLinks.push({
        label: 'Group overview',
        href: '/dashboard/workspace',
        icon: LayoutDashboard,
      })
      if (can('members:read')) {
        workspaceLinks.push({ label: 'Members', href: '/dashboard/members', icon: Users })
      }
      if (can('members:invite')) {
        workspaceLinks.push({
          label: 'Invitations',
          href: '/dashboard/invitations',
          icon: MailPlus,
        })
      }
      if (can('membership:requests_review')) {
        workspaceLinks.push({
          label: 'Membership requests',
          href: '/dashboard/membership-requests',
          icon: ClipboardCheck,
        })
      }
      if (can('contributions:read')) {
        workspaceLinks.push({
          label: 'Contributions',
          href: '/dashboard/contributions',
          icon: PiggyBank,
        })
      } else if (can('contributions:record')) {
        workspaceLinks.push({
          label: 'Record contribution',
          href: '/dashboard/contributions/new',
          icon: PiggyBank,
        })
      }
      if (can('financial:read', 'shares:read', 'shares:manage', 'obligations:read')) {
        workspaceLinks.push({
          label: 'Savings & finance',
          href: '/dashboard/savings',
          icon: Wallet,
        })
      }
      if (can('loans:read', 'financial:read')) {
        workspaceLinks.push({ label: 'Loans', href: '/dashboard/loans', icon: HandCoins })
      }
      if (can(...operationalPermissions)) {
        workspaceLinks.push({ label: 'Operations', href: '/dashboard/operations', icon: Activity })
      }
      if (can('meetings:read', 'meetings:manage')) {
        workspaceLinks.push({
          label: 'Governance & meetings',
          href: '/dashboard/meetings',
          icon: Calendar,
        })
      }
      if (can('reports:read', 'financial:read')) {
        workspaceLinks.push({ label: 'Reports', href: '/dashboard/reports', icon: FileText })
      }
      if (can('audit:read', 'financial_audit:read')) {
        workspaceLinks.push({
          label: 'Activity & audit',
          href: '/dashboard/audit',
          icon: ClipboardList,
        })
      }
      if (can('communications:read', 'communications:send')) {
        workspaceLinks.push({
          label: 'Official communications',
          href: '/dashboard/communications',
          icon: MessageCircle,
        })
      }
      if (can('announcements:manage')) {
        workspaceLinks.push({
          label: 'Announcements',
          href: '/dashboard/announcements',
          icon: Bell,
        })
      }
      if (can('groups:manage')) {
        workspaceLinks.push({
          label: 'Group settings',
          href: '/dashboard/group-settings',
          icon: Settings2,
        })
      }
    }
    if (can('onboarding:manage', 'groups:manage')) {
      workspaceLinks.push({
        label: 'Member onboarding setup',
        href: '/dashboard/onboarding-settings',
        icon: ClipboardCheck,
      })
    }
    if (workspaceLinks.length) next.push({ label: 'Manage Ikimina', links: workspaceLinks })

    if (can('roles:read', 'roles:manage')) {
      next.push({
        label: 'Access control',
        links: [{ label: 'Role assignments', href: '/dashboard/roles', icon: SlidersHorizontal }],
      })
    }

    const technicalLinks: DashboardLink[] = []
    if (canViewTechnicalDiagnostics(permissions)) {
      technicalLinks.push({
        label: 'Technical support',
        href: '/dashboard/technical-support',
        icon: Wrench,
      })
    }
    if (canManageSystemControls(permissions)) {
      technicalLinks.push({
        label: 'System control center',
        href: '/dashboard/system',
        icon: SlidersHorizontal,
      })
    }
    if (technicalLinks.length) {
      next.push({
        label: 'Technical access',
        links: technicalLinks,
      })
    }

    if (can('security:audit')) {
      next.push({
        label: 'Security',
        links: [
          { label: 'Security and access audit', href: '/dashboard/security', icon: ClipboardList },
        ],
      })
    }

    next.push({
      label: 'Account',
      links: [
        { label: 'Join an Ikimina', href: '/dashboard/join', icon: Users },
        { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
        { label: 'Account settings', href: '/dashboard/settings', icon: Settings2 },
      ],
    })
    return next
  }, [access])

  return {
    sections,
    loading: groupLoading || accessLoading,
    group,
    groups: availableGroups,
    setGroup,
    access,
    accessByGroup,
    workspaceGroups,
    technicalGroups,
  }
}
