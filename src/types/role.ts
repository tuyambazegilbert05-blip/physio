export const groupRoles = [
  'chairperson',
  'committee_member',
  'group_administrator',
  'treasurer',
  'secretary',
  'system_administrator',
  'technician',
  'security_administrator',
  'super_administrator',
] as const

export type GroupRole = (typeof groupRoles)[number]

export const roleLabels: Record<GroupRole, string> = {
  chairperson: 'Chairperson',
  committee_member: 'Committee member',
  group_administrator: 'Group administrator',
  treasurer: 'Treasurer',
  secretary: 'Secretary',
  system_administrator: 'System administrator',
  technician: 'Technician',
  security_administrator: 'Security administrator',
  super_administrator: 'Super administrator',
}

export type RoleAssignment = {
  group_id: string
  user_id: string
  role_key: GroupRole
  granted_at: string
  full_name: string
  email: string | null
}

export type GroupAccess = {
  group_id: string
  current_user_id: string
  is_member: boolean
  roles: GroupRole[]
  permissions: string[]
  assignments: RoleAssignment[]
}
