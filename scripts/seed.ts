import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '../src/lib/security/password-hash.ts'

if (process.env.NODE_ENV === 'production') throw new Error('Development seed data is disabled in production.')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.PhyaioCycle_SEED_PASSWORD
if (!url || !serviceKey || !password) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and PhyaioCycle_SEED_PASSWORD for development seeding.')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const uuid = (sequence: number) => `d0000000-0000-4000-8000-${sequence.toString(16).padStart(12, '0')}`
const mainGroupId = uuid(1)
const seedTime = new Date().toISOString()
const ownerEmail = 'treasurer@PhyaioCycle.local'
const technicianEmail = 'support@PhyaioCycle.local'
function seedUser(sequence: number, email: string, fullName: string, initialPassword = randomBytes(32).toString('base64url')) {
  return { id: uuid(0x1000 + sequence), email, fullName, password: initialPassword }
}

const owner = seedUser(0, ownerEmail, 'Development Treasurer', password)
const technician = seedUser(1, technicianEmail, 'Development Technician')
const demoUsers: Array<ReturnType<typeof seedUser>> = []
for (let index = 1; index <= 11; index += 1) {
  const suffix = String(index).padStart(2, '0')
  demoUsers.push(seedUser(index + 1, `demo.member.${suffix}@PhyaioCycle.local`, `Demo Member ${suffix}`))
}

const profileRows = [
  ...[owner, technician, ...demoUsers].map((user) => ({
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    normalized_email: user.email.toLowerCase(),
    email_verified_at: seedTime,
    account_status: 'active',
  })),
]
const { error: profilesError } = await admin.from('profiles').upsert(profileRows, { ignoreDuplicates: true })
if (profilesError) throw profilesError
const credentialRows: Array<{ user_id: string; password_hash: string; password_changed_at: string; updated_at: string }> = []
for (const user of [owner, technician, ...demoUsers]) {
  credentialRows.push({
    user_id: user.id,
    password_hash: await hashPassword(user.password),
    password_changed_at: seedTime,
    updated_at: seedTime,
  })
}
const { error: credentialsError } = await admin.from('app_password_credentials').upsert(credentialRows, { ignoreDuplicates: true })
if (credentialsError) throw credentialsError

const groupRows = Array.from({ length: 9 }, (_, index) => ({
  id: uuid(0x100 + index),
  name: `Demo Savings Group ${String(index + 1).padStart(2, '0')}`,
  currency: 'RWF',
  contribution_amount: 75000,
  contribution_frequency: 'monthly',
  created_by: demoUsers[index].id,
}))
const groups = [
  { id: mainGroupId, name: 'Imboni Group', currency: 'RWF', contribution_amount: 75000, contribution_frequency: 'monthly', created_by: owner.id },
  ...groupRows,
]
const { error: groupsError } = await admin.from('groups').upsert(groups, { ignoreDuplicates: true })
if (groupsError) throw groupsError

const groupLeaders = [
  { groupId: mainGroupId, userId: owner.id, memberId: uuid(0x10) },
  ...groupRows.map((group, index) => ({ groupId: group.id, userId: demoUsers[index].id, memberId: uuid(0x20 + index) })),
]
const memberRows = [
  { id: uuid(0x10), group_id: mainGroupId, user_id: owner.id, full_name: 'Development Treasurer', email: ownerEmail, status: 'active' },
  { id: uuid(0x11), group_id: mainGroupId, full_name: 'Mugisha Eric', email: 'eric@PhyaioCycle.local', status: 'active' },
  { id: uuid(0x12), group_id: mainGroupId, full_name: 'Uwase Diane', email: 'diane@PhyaioCycle.local', status: 'active' },
  { id: uuid(0x13), group_id: mainGroupId, full_name: 'Niyonzima Claude', email: 'claude@PhyaioCycle.local', status: 'active' },
  ...demoUsers.slice(9).map((user, index) => ({
    id: uuid(0x14 + index), group_id: mainGroupId, user_id: user.id,
    full_name: `Demo Member ${String(index + 10).padStart(2, '0')}`,
    email: user.email!, status: 'active',
  })),
  ...groupRows.map((group, index) => ({
    id: uuid(0x20 + index), group_id: group.id, user_id: demoUsers[index].id,
    full_name: `Demo Member ${String(index + 1).padStart(2, '0')}`,
    email: demoUsers[index].email!, status: 'active',
  })),
]
const { error: membersError } = await admin.from('members').upsert(memberRows, { ignoreDuplicates: true })
if (membersError) throw membersError

const roleAssignments = [
  ...['chairperson', 'committee_member', 'system_administrator', 'treasurer'].map((role_key) => ({ group_id: mainGroupId, user_id: owner.id, role_key, user_email: ownerEmail, granted_by: owner.id })),
  { group_id: mainGroupId, user_id: technician.id, role_key: 'technician', user_email: technicianEmail, granted_by: owner.id },
  ...groupRows.flatMap((group, index) => ['chairperson', 'committee_member', 'system_administrator'].map((role_key) => ({ group_id: group.id, user_id: demoUsers[index].id, role_key, user_email: demoUsers[index].email!, granted_by: demoUsers[index].id }))),
]
const { error: rolesError } = await admin.from('group_role_assignments').upsert(roleAssignments, { ignoreDuplicates: true })
if (rolesError) throw rolesError

const contributionRows = [
  { id: uuid(0x21), group_id: mainGroupId, member_id: uuid(0x11), amount: 75000, contribution_type: 'regular', period: '2026-09-01', status: 'verified', received_at: seedTime, verified_by: owner.id, verified_at: seedTime },
  { id: uuid(0x22), group_id: mainGroupId, member_id: uuid(0x12), amount: 75000, contribution_type: 'regular', period: '2026-09-01', status: 'pending', received_at: seedTime, verified_by: null, verified_at: null },
  { id: uuid(0x23), group_id: mainGroupId, member_id: uuid(0x13), amount: 75000, contribution_type: 'regular', period: '2026-10-01', status: 'verified', received_at: seedTime, verified_by: owner.id, verified_at: seedTime },
  ...groupRows.map((group, index) => ({
    id: uuid(0x30 + index), group_id: group.id, member_id: uuid(0x20 + index),
    amount: 75000, contribution_type: 'regular', period: `2026-${String(8 + (index % 3)).padStart(2, '0')}-01`,
    status: 'verified', received_at: seedTime, verified_by: demoUsers[index].id, verified_at: seedTime,
  })),
  { id: uuid(0x39), group_id: mainGroupId, member_id: uuid(0x14), amount: 75000, contribution_type: 'regular', period: '2026-10-01', status: 'pending', received_at: seedTime, verified_by: null, verified_at: null },
]
const { error: contributionsError } = await admin.from('contributions').upsert(contributionRows, { ignoreDuplicates: true })
if (contributionsError) throw contributionsError

const adjustmentRows = Array.from({ length: 12 }, (_, index) => {
  const group = groupLeaders[index % groupLeaders.length]
  return {
    id: uuid(0x40 + index), group_id: group.groupId, amount: 5000,
    reason: `Development seed reserve adjustment ${String(index + 1).padStart(2, '0')}`,
    created_by: group.userId,
  }
})
const { error: adjustmentsError } = await admin.from('savings_adjustments').upsert(adjustmentRows, { ignoreDuplicates: true })
if (adjustmentsError) throw adjustmentsError

const loanRows = Array.from({ length: 12 }, (_, index) => {
  const group = groupLeaders[index % groupLeaders.length]
  return {
    id: uuid(0x50 + index), group_id: group.groupId, member_id: group.memberId,
    principal: 25000, outstanding_amount: 25000, interest_rate: 5, term_months: 6,
    purpose: `Development seed loan ${String(index + 1).padStart(2, '0')}: member support.`,
    status: 'active', approved_by: group.userId, due_date: '2027-04-01',
  }
})
const { error: loansError } = await admin.from('loans').upsert(loanRows, { ignoreDuplicates: true })
if (loansError) throw loansError

const repaymentRows = loanRows.map((loan, index) => ({
  id: uuid(0x60 + index), loan_id: loan.id, amount: 5000,
  received_by: groupLeaders[index % groupLeaders.length].userId,
  received_at: seedTime, reference: `DEMO-REPAY-${String(index + 1).padStart(3, '0')}`,
}))
const { error: repaymentsError } = await admin.from('loan_repayments').upsert(repaymentRows, { ignoreDuplicates: true })
if (repaymentsError) throw repaymentsError

const meetingRows = Array.from({ length: 12 }, (_, index) => {
  const group = groupLeaders[index % groupLeaders.length]
  const startsAt = new Date(Date.UTC(2026, 9, 5 + index, 16, 0))
  return {
    id: uuid(0x70 + index), group_id: group.groupId,
    title: `Monthly meeting ${String(index + 1).padStart(2, '0')}`,
    agenda: 'Review member contributions, savings, and upcoming group activities.',
    location: 'Community hall', starts_at: startsAt.toISOString(),
    ends_at: new Date(startsAt.getTime() + 90 * 60 * 1000).toISOString(), created_by: group.userId,
  }
})
const { error: meetingsError } = await admin.from('meetings').upsert(meetingRows, { ignoreDuplicates: true })
if (meetingsError) throw meetingsError

const attendanceRows = meetingRows.map((meeting, index) => {
  const group = groupLeaders[index % groupLeaders.length]
  return {
    id: uuid(0x80 + index), meeting_id: meeting.id, member_id: group.memberId,
    present: index % 4 !== 3, recorded_by: group.userId,
  }
})
const { error: attendanceError } = await admin.from('attendance').upsert(attendanceRows, { ignoreDuplicates: true })
if (attendanceError) throw attendanceError

const notificationRows = profileRows.map((profile, index) => ({
  id: uuid(0x90 + index), user_id: profile.id,
  title: index % 2 === 0 ? 'Monthly meeting reminder' : 'Contribution recorded',
  body: index % 2 === 0 ? 'Your savings group meeting is scheduled for this month.' : 'A development contribution record is available in your group ledger.',
  href: index % 2 === 0 ? '/dashboard/meetings' : '/dashboard/contributions',
}))
const { error: notificationsError } = await admin.from('notifications').upsert(notificationRows, { ignoreDuplicates: true })
if (notificationsError) throw notificationsError

console.log('Development seed complete: 13 accounts/profiles, 10 groups, 15 members, 13 contributions, 12 savings adjustments, 12 loans, 12 repayments, 12 meetings, 12 attendance records, and 13 notifications. The support account has technician access without group membership.')
