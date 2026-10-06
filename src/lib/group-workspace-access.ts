/**
 * Capabilities that represent group operations. Group metadata visibility and
 * platform-only technical permissions do not open an Ikimina workspace.
 */
export const groupWorkspacePermissions = [
  'groups:manage',
  'members:read',
  'members:manage',
  'members:delete',
  'members:invite',
  'membership:requests_review',
  'contributions:read',
  'contributions:record',
  'contributions:verify',
  'loans:read',
  'loans:approve',
  'loans:disburse',
  'loans:manage',
  'repayments:read',
  'repayments:record',
  'repayments:verify',
  'meetings:read',
  'meetings:manage',
  'announcements:manage',
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
  'reports:read',
  'analytics:read',
  'financial:read',
  'financial:adjust',
  'financial_audit:read',
] as const

export function hasGroupWorkspaceAccess(permissions: readonly string[] | null | undefined) {
  if (!permissions?.length) return false
  const granted = new Set(permissions)
  return groupWorkspacePermissions.some((permission) => granted.has(permission))
}

export function hasAnyPermission(
  permissions: readonly string[] | null | undefined,
  ...required: string[]
) {
  if (!permissions?.length) return false
  const granted = new Set(permissions)
  return required.some((permission) => granted.has(permission))
}

export function canViewTechnicalDiagnostics(permissions: readonly string[] | null | undefined) {
  return hasAnyPermission(permissions, 'system:monitor', 'support:manage')
}

export function canManageSystemControls(permissions: readonly string[] | null | undefined) {
  return hasAnyPermission(
    permissions,
    'system:configure',
    'system:maintenance',
    'system:lock',
    'system:modules',
  )
}

export function financialWorkspacePath(permissions: readonly string[] | null | undefined) {
  if (
    hasAnyPermission(
      permissions,
      'financial:read',
      'shares:read',
      'shares:manage',
      'obligations:read',
    )
  ) {
    return '/dashboard/savings'
  }
  if (hasAnyPermission(permissions, 'contributions:read', 'contributions:verify')) {
    return '/dashboard/contributions'
  }
  if (hasAnyPermission(permissions, 'contributions:record')) {
    return '/dashboard/contributions/new'
  }
  if (
    hasAnyPermission(permissions, 'loans:read', 'loans:manage', 'loans:disburse', 'repayments:read')
  ) {
    return '/dashboard/loans'
  }
  if (
    hasAnyPermission(
      permissions,
      'financial:adjust',
      'payments:read',
      'payments:record',
      'payments:verify',
      'reconciliation:manage',
      'social_fund:read',
      'social_fund:manage',
      'interest:read',
      'interest:calculate',
      'closing:read',
      'closing:manage',
      'profit:calculate',
      'profit:distribute',
      'expenses:read',
      'expenses:manage',
      'expenses:approve',
      'corrections:request',
      'corrections:approve',
    )
  ) {
    return '/dashboard/operations'
  }
  if (hasAnyPermission(permissions, 'reports:read', 'analytics:read', 'financial_audit:read')) {
    return '/dashboard/reports'
  }
  return null
}

export function governanceWorkspacePath(permissions: readonly string[] | null | undefined) {
  if (hasAnyPermission(permissions, 'meetings:read', 'meetings:manage'))
    return '/dashboard/meetings'
  if (hasAnyPermission(permissions, 'announcements:manage')) return '/dashboard/announcements'
  if (hasAnyPermission(permissions, 'communications:read', 'communications:send')) {
    return '/dashboard/communications'
  }
  return null
}

export function administrativeWorkspacePath(permissions: readonly string[] | null | undefined) {
  if (hasAnyPermission(permissions, 'members:read', 'members:manage', 'members:delete')) {
    return '/dashboard/members'
  }
  if (hasAnyPermission(permissions, 'membership:requests_review')) {
    return '/dashboard/membership-requests'
  }
  if (hasAnyPermission(permissions, 'members:invite')) return '/dashboard/invitations'
  if (hasAnyPermission(permissions, 'groups:manage')) return '/dashboard/group-settings'
  return null
}
