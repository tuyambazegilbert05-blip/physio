export type AuditView = 'group' | 'security'

export const securityAuditEntities = [
  'account_security_events',
  'group_role_assignments',
  'group_system_controls',
] as const

export function canReadAuditView(
  view: AuditView,
  permissions: readonly string[] | null | undefined,
) {
  if (!permissions?.length) return false
  const grants = new Set(permissions)
  return view === 'security'
    ? grants.has('security:audit')
    : grants.has('audit:read') || grants.has('financial_audit:read')
}
