export type GroupCycle = {
  id: string
  group_id: string
  cycle_number: number
  name: string
  starts_on: string
  ends_on: string
  share_price: number
  contribution_amount: number
  contribution_due_day: number
  late_penalty: number
  loan_limit: number | null
  rules: Record<string, unknown>
  status: 'draft' | 'open' | 'closing' | 'closed' | 'archived'
  created_by: string
  approved_by: string | null
  created_at: string
  opened_at: string | null
  closed_at: string | null
}

export type CycleMember = {
  id: string
  group_id: string
  cycle_id: string
  member_id: string
  status: 'active' | 'withdrawn' | 'completed'
  joined_on: string
  ended_on: string | null
  created_at: string
}
export type ContributionObligation = {
  id: string
  group_id: string
  cycle_id: string
  member_id: string
  period: string
  due_on: string
  amount_due: number
  savings_due: number
  social_due: number
  penalty_amount: number
  status: 'due' | 'partially_paid' | 'paid' | 'waived'
  created_by: string
  created_at: string
}
export type ShareTransaction = {
  id: string
  group_id: string
  cycle_id: string
  member_id: string
  direction: 'purchase' | 'sale'
  units: number
  unit_price: number
  amount: number
  status: 'pending' | 'verified' | 'rejected'
  reference: string | null
  created_by: string
  verified_by: string | null
  verified_at: string | null
  created_at: string
}
export type BankTransaction = {
  id: string
  group_id: string
  account_label: string
  transaction_date: string
  description: string
  amount: number
  reference: string
  matched_entity: string | null
  matched_entity_id: string | null
  status: 'unmatched' | 'matched' | 'reconciled' | 'ignored'
  imported_by: string
  reconciled_by: string | null
  reconciled_at: string | null
  created_at: string
}
export type SocialFundRequest = {
  id: string
  group_id: string
  member_id: string
  amount_requested: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'cancelled'
  decision_note: string | null
  requested_by: string
  decided_by: string | null
  decided_at: string | null
  disbursed_at: string | null
  disbursement_reference: string | null
  created_at: string
}
export type GroupExpense = {
  id: string
  group_id: string
  cycle_id: string | null
  category: 'operations' | 'meeting' | 'social_fund' | 'profit_distribution' | 'other'
  description: string
  funding_source: 'group' | 'social_fund' | 'profit'
  amount: number
  spent_on: string
  payment_method: 'cash' | 'bank' | 'mobile_money' | 'other'
  reference: string | null
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  created_by: string
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  created_at: string
}
export type LoanInterestCharge = {
  id: string
  group_id: string
  loan_id: string
  period: string
  due_on: string
  principal_basis: number
  rate: number
  amount: number
  created_by: string
  created_at: string
}
export type FinancialPeriodClosing = {
  id: string
  group_id: string
  cycle_id: string | null
  period: string
  status: 'review' | 'closed' | 'reopened'
  snapshot: Record<string, unknown>
  prepared_by: string
  approved_by: string | null
  prepared_at: string
  closed_at: string | null
}
export type FinancialCorrectionRequest = {
  id: string
  group_id: string
  closing_id: string
  entity: string
  entity_id: string
  reason: string
  proposed_values: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  requested_by: string
  decided_by: string | null
  decision_note: string | null
  created_at: string
  decided_at: string | null
}
export type ProfitCalculation = {
  id: string
  group_id: string
  cycle_id: string
  period: string | null
  income: number
  expenses: number
  net_profit: number
  allocation_formula: Record<string, unknown>
  allocations: Array<{ member_id: string; amount: number; reference?: string; units?: number }>
  status: 'draft' | 'approved' | 'distributed'
  calculated_by: string
  approved_by: string | null
  distributed_at: string | null
  created_at: string
}
