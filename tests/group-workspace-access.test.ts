import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canManageSystemControls,
  canViewTechnicalDiagnostics,
  administrativeWorkspacePath,
  financialWorkspacePath,
  governanceWorkspacePath,
  hasAnyPermission,
  hasGroupWorkspaceAccess,
} from '../src/lib/group-workspace-access.ts'
import { permissionsForRoles } from '../src/lib/permissions.ts'
import { canReadAuditView, securityAuditEntities } from '../src/lib/audit-access.ts'

test('group workspace visibility is derived from explicit group capabilities', () => {
  assert.equal(hasGroupWorkspaceAccess(['members:read']), true)
  assert.equal(hasGroupWorkspaceAccess(['financial:read']), true)
  assert.equal(hasGroupWorkspaceAccess(['membership:requests_review']), true)
  assert.equal(hasGroupWorkspaceAccess(['announcements:manage']), true)
})

test('group metadata and technical permissions alone do not open group operations', () => {
  assert.equal(hasGroupWorkspaceAccess(['groups:read']), false)
  assert.equal(hasGroupWorkspaceAccess(['communications:read', 'communications:send']), false)
  assert.equal(hasGroupWorkspaceAccess(['roles:manage', 'audit:read']), false)
  assert.equal(hasGroupWorkspaceAccess(['cycles:read']), false)
  assert.equal(
    hasGroupWorkspaceAccess(['system:configure', 'security:audit', 'support:manage']),
    false,
  )
  assert.equal(hasGroupWorkspaceAccess([]), false)
})

test('role combinations use the union of resolved permissions without role-name checks', () => {
  const groupAPermissions = ['members:read', 'loans:read', 'meetings:read']
  const groupBPermissions = ['communications:read']

  assert.equal(hasGroupWorkspaceAccess(groupAPermissions), true)
  assert.equal(hasGroupWorkspaceAccess(groupBPermissions), false)
  assert.equal(
    hasAnyPermission([...groupAPermissions, ...groupBPermissions], 'loans:approve'),
    false,
  )
  assert.equal(hasAnyPermission(groupAPermissions, 'meetings:read'), true)
})

test('chairperson composes governance and technical access without implicit financial approval', () => {
  const chairperson = permissionsForRoles(['chairperson'])
  assert.equal(chairperson.includes('system:configure'), true)
  assert.equal(chairperson.includes('meetings:read'), true)
  assert.equal(chairperson.includes('onboarding:manage'), true)
  assert.equal(chairperson.includes('loans:approve'), false)
  assert.equal(chairperson.includes('contributions:verify'), false)
  assert.equal(chairperson.includes('profit:distribute'), false)

  const chairpersonTreasurer = permissionsForRoles(['chairperson', 'treasurer'])
  assert.equal(chairpersonTreasurer.includes('loans:approve'), false)
  assert.equal(chairpersonTreasurer.includes('contributions:verify'), true)
})

test('member onboarding setup is granted to Chairperson without opening group profile settings', () => {
  const chairperson = permissionsForRoles(['chairperson'])
  assert.equal(hasAnyPermission(chairperson, 'onboarding:manage'), true)
  assert.equal(chairperson.includes('groups:manage'), false)
  assert.equal(hasAnyPermission(permissionsForRoles(['treasurer']), 'onboarding:manage'), false)
})

test('committee oversight does not imply financial write capabilities', () => {
  const committee = permissionsForRoles(['committee_member'])
  assert.equal(committee.includes('financial:read'), true)
  assert.equal(committee.includes('loans:approve'), false)
  assert.equal(committee.includes('profit:distribute'), false)
  assert.equal(committee.includes('cycles:manage'), false)
})

test('technical roles do not inherit group operations or financial visibility', () => {
  for (const role of ['system_administrator', 'technician', 'security_administrator'] as const) {
    const permissions = permissionsForRoles([role])
    assert.equal(hasGroupWorkspaceAccess(permissions), false)
    assert.equal(permissions.includes('financial:read'), false)
    assert.equal(permissions.includes('contributions:verify'), false)
    assert.equal(permissions.includes('loans:approve'), false)
    assert.equal(permissions.includes('profit:distribute'), false)
  }

  assert.equal(permissionsForRoles(['technician']).includes('system:monitor'), true)
  assert.equal(permissionsForRoles(['security_administrator']).includes('security:audit'), true)
  assert.equal(permissionsForRoles(['security_administrator']).includes('audit:read'), false)
  assert.equal(canReadAuditView('security', permissionsForRoles(['security_administrator'])), true)
  assert.equal(canReadAuditView('group', permissionsForRoles(['security_administrator'])), false)
  assert.equal(canReadAuditView('security', permissionsForRoles(['technician'])), false)
  assert.deepEqual(securityAuditEntities, [
    'account_security_events',
    'group_role_assignments',
    'group_system_controls',
  ])
})

test('technical workspace links reflect monitoring and control permissions separately', () => {
  const technician = permissionsForRoles(['technician'])
  assert.equal(canViewTechnicalDiagnostics(technician), true)
  assert.equal(canManageSystemControls(technician), false)

  const administrator = permissionsForRoles(['system_administrator'])
  assert.equal(canViewTechnicalDiagnostics(administrator), true)
  assert.equal(canManageSystemControls(administrator), true)

  const treasurer = permissionsForRoles(['treasurer'])
  assert.equal(canViewTechnicalDiagnostics(treasurer), false)
  assert.equal(canManageSystemControls(treasurer), false)

  const securityAdministrator = permissionsForRoles(['security_administrator'])
  assert.equal(canViewTechnicalDiagnostics(securityAdministrator), true)
  assert.equal(canManageSystemControls(securityAdministrator), false)
})

test('financial, governance, and administrative workspaces resolve to permitted real modules', () => {
  const treasurer = permissionsForRoles(['treasurer'])
  assert.equal(financialWorkspacePath(treasurer), '/dashboard/savings')
  assert.equal(governanceWorkspacePath(treasurer), '/dashboard/communications')
  assert.equal(administrativeWorkspacePath(treasurer), '/dashboard/members')

  const secretary = permissionsForRoles(['secretary'])
  assert.equal(financialWorkspacePath(secretary), '/dashboard/reports')
  assert.equal(governanceWorkspacePath(secretary), '/dashboard/meetings')
  assert.equal(administrativeWorkspacePath(secretary), '/dashboard/members')

  const technician = permissionsForRoles(['technician'])
  assert.equal(financialWorkspacePath(technician), null)
  assert.equal(governanceWorkspacePath(technician), null)
  assert.equal(administrativeWorkspacePath(technician), null)
})

test('treasurer and secretary capabilities remain separate from technical and approval duties', () => {
  const treasurer = permissionsForRoles(['treasurer'])
  assert.equal(treasurer.includes('contributions:verify'), true)
  assert.equal(treasurer.includes('roles:manage'), false)
  assert.equal(treasurer.includes('system:configure'), false)
  assert.equal(treasurer.includes('loans:approve'), false)
  assert.equal(treasurer.includes('profit:distribute'), false)

  const secretary = permissionsForRoles(['secretary'])
  assert.equal(secretary.includes('meetings:manage'), true)
  assert.equal(secretary.includes('announcements:manage'), true)
  assert.equal(secretary.includes('contributions:verify'), false)
  assert.equal(secretary.includes('loans:approve'), false)
  assert.equal(secretary.includes('system:configure'), false)
})
