import type { GroupRole } from '@/types/role'

const permissionMap = {
  chairperson: ['groups:read', 'groups:manage', 'members:read', 'members:manage', 'members:delete', 'contributions:read', 'loans:read', 'loans:approve', 'repayments:read', 'meetings:read', 'meetings:manage', 'announcements:manage', 'reports:read', 'financial:read', 'social_fund:read', 'profit:distribute', 'communications:read', 'communications:send', 'cycles:manage', 'financial_audit:read', 'audit:read'],
  committee_member: ['groups:read', 'members:read', 'contributions:read', 'loans:read', 'loans:approve', 'repayments:read', 'meetings:read', 'reports:read', 'financial:read', 'communications:read', 'profit:distribute', 'cycles:manage', 'financial_audit:read'],
  group_administrator: ['groups:read', 'groups:manage', 'members:read', 'members:manage', 'contributions:read', 'loans:read', 'repayments:read', 'meetings:read', 'meetings:manage', 'announcements:manage', 'reports:read', 'financial:read', 'communications:read', 'communications:send', 'cycles:manage', 'financial_audit:read'],
  treasurer: ['groups:read', 'members:read', 'contributions:read', 'contributions:record', 'contributions:verify', 'loans:read', 'loans:disburse', 'loans:manage', 'repayments:read', 'repayments:record', 'reports:read', 'financial:read', 'financial:adjust', 'shares:manage', 'social_fund:read', 'social_fund:manage', 'profit:calculate', 'communications:read', 'financial_audit:read'],
  secretary: ['groups:read', 'members:read', 'members:manage', 'meetings:read', 'meetings:manage', 'announcements:manage', 'reports:read', 'communications:read', 'communications:send', 'cycles:manage'],
  system_administrator: ['groups:read', 'roles:read', 'roles:manage', 'system:users_manage', 'system:configure', 'system:maintenance', 'system:lock', 'system:modules', 'system:backup', 'system:monitor', 'audit:read'],
  technician: ['groups:read', 'support:manage', 'system:monitor'],
  security_administrator: ['groups:read', 'roles:read', 'system:monitor', 'security:manage', 'security:audit', 'audit:read'],
  super_administrator: ['groups:read', 'groups:manage', 'members:read', 'members:manage', 'members:delete', 'roles:read', 'roles:manage', 'contributions:read', 'contributions:record', 'contributions:verify', 'loans:read', 'loans:approve', 'loans:disburse', 'loans:manage', 'repayments:read', 'repayments:record', 'meetings:read', 'meetings:manage', 'announcements:manage', 'communications:read', 'communications:send', 'cycles:manage', 'reports:read', 'financial:read', 'financial:adjust', 'shares:manage', 'social_fund:read', 'social_fund:manage', 'profit:calculate', 'profit:distribute', 'financial_audit:read', 'audit:read', 'system:users_manage', 'system:configure', 'system:maintenance', 'system:lock', 'system:modules', 'system:backup', 'system:monitor', 'security:manage', 'security:audit', 'support:manage', 'superadmin:manage'],
} as const satisfies Record<GroupRole, readonly string[]>

export type Permission = (typeof permissionMap)[GroupRole][number]

export function hasPermission(roles: readonly GroupRole[] | null | undefined, permission: Permission) {
  return Boolean(roles?.some((role) => (permissionMap[role] as readonly string[]).includes(permission)))
}

export function permissionsForRoles(roles: readonly GroupRole[]) {
  return [...new Set(roles.flatMap((role) => permissionMap[role]))] as Permission[]
}
