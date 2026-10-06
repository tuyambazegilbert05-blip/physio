import type { Group } from '@/types/group'
import type { GroupRole } from '@/types/role'
import type { Member } from '@/types/member'

export type MemberPosition = {
  group: Pick<Group, 'id' | 'name' | 'currency' | 'contribution_amount' | 'contribution_frequency'>
  member: Member
  profileName: string
  roles: GroupRole[]
  systemControls: { status: 'normal' | 'limited' | 'maintenance' | 'locked'; message: string | null; disabled_modules: string[] }
  cycle: {
    id: string
    name: string
    starts_on: string
    ends_on: string
    share_price: number
    contribution_amount: number
    contribution_due_day: number
    rules: Record<string, unknown>
    status: 'open'
  } | null
  contributions: Array<{
    id: string
    obligation_id: string | null
    amount: number
    contribution_type: 'regular' | 'social' | 'special'
    period: string
    status: 'pending' | 'verified' | 'rejected'
    reference: string | null
    received_at: string | null
    created_at: string
  }>
  obligations: Array<{
    id: string
    period: string
    due_on: string
    amount_due: number
    penalty_amount: number
    status: 'due' | 'partially_paid' | 'paid' | 'waived'
  }>
  shares: Array<{
    id: string
    direction: 'purchase' | 'sale'
    units: number
    unit_price: number
    amount: number
    status: 'pending' | 'verified' | 'rejected'
    reference: string | null
    created_at: string
  }>
  loans: Array<{
    id: string
    principal: number
    outstanding_amount: number
    outstanding_interest: number
    interest_rate: number
    term_months: number
    purpose: string
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'repaid' | 'defaulted'
    due_date: string | null
    disbursed_at: string | null
    created_at: string
  }>
  repayments: Array<{
    id: string
    loan_id: string
    amount: number
    principal_amount: number
    interest_amount: number
    status: 'pending' | 'verified' | 'rejected'
    received_at: string
    reference: string | null
    payment_method: 'cash' | 'bank' | 'mobile_money' | 'other'
  }>
  interestCharges: Array<{
    id: string
    loan_id: string
    period: string
    due_on: string
    principal_basis: number
    rate: number
    amount: number
  }>
  socialRequests: Array<{
    id: string
    amount_requested: number
    reason: string
    status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'cancelled'
    decision_note: string | null
    disbursement_reference: string | null
    created_at: string
    decided_at: string | null
    disbursed_at: string | null
  }>
  notifications: Array<{
    id: string
    title: string
    body: string
    href: string | null
    read_at: string | null
    created_at: string
  }>
  announcements: Array<{ id: string; title: string; body: string; published_at: string }>
}
