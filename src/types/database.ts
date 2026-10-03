import type { Attendance, MeetingDecision } from './meeting'
import type { Contribution } from './contribution'
import type { Group } from './group'
import type { Loan } from './loan'
import type { Meeting } from './meeting'
import type { Member } from './member'
import type { NotificationRecord } from './notification'
import type { GroupRole } from './role'
import type { UserProfile } from './user'
import type {
  BankTransaction,
  ContributionObligation,
  CycleMember,
  FinancialCorrectionRequest,
  FinancialPeriodClosing,
  GroupCycle,
  GroupExpense,
  LoanInterestCharge,
  ProfitCalculation,
  ShareTransaction,
  SocialFundRequest,
} from './operations'

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] }
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: Table<UserProfile>
      groups: Table<Group & { reserve_balance: number }>
      members: Table<Member & { legacy_role: string }>
      group_role_catalog: Table<{ role_key: GroupRole; label: string; role_domain: string }>
      permissions: Table<{ permission_key: string; label: string; permission_domain: string }>
      role_permissions: Table<{ role_key: GroupRole; permission_key: string }>
      group_role_assignments: Table<{ group_id: string; user_id: string; role_key: GroupRole; user_email: string | null; granted_by: string | null; granted_at: string }>
      contributions: Table<Contribution>
      loans: Table<Loan & { cycle_id: string | null; outstanding_interest: number; is_draft: boolean; rejection_reason: string | null; disbursement_reference: string | null; disbursed_at: string | null }>
      loan_repayments: Table<{ id: string; loan_id: string; group_id: string; amount: number; principal_amount: number; interest_amount: number; status: 'pending' | 'verified' | 'rejected'; created_by: string | null; received_by: string; received_at: string; verified_by: string | null; verified_at: string | null; payment_method: 'cash' | 'bank' | 'mobile_money' | 'other'; reference: string | null }>
      savings_adjustments: Table<{ id: string; group_id: string; amount: number; reason: string; created_by: string; created_at: string }>
      group_cycles: Table<GroupCycle>
      cycle_members: Table<CycleMember>
      contribution_obligations: Table<ContributionObligation>
      share_transactions: Table<ShareTransaction>
      bank_transactions: Table<BankTransaction>
      social_fund_requests: Table<SocialFundRequest>
      expenses: Table<GroupExpense>
      loan_interest_charges: Table<LoanInterestCharge>
      financial_period_closings: Table<FinancialPeriodClosing>
      financial_correction_requests: Table<FinancialCorrectionRequest>
      profit_calculations: Table<ProfitCalculation>
      meetings: Table<Meeting>
      meeting_decisions: Table<MeetingDecision>
      meeting_votes: Table<{ id: string; decision_id: string; member_id: string; vote: 'yes' | 'no' | 'abstain'; cast_at: string }>
      attendance: Table<Attendance>
      notifications: Table<NotificationRecord>
      audit_logs: Table<{ id: number; group_id: string | null; actor_id: string | null; action: string; entity: string; entity_id: string | null; details: Json; permission_used: string | null; authority_roles: string[]; before_data: Json | null; after_data: Json | null; created_at: string }>
    }
    Views: { savings_summary: { Row: { group_id: string; currency: string; total_contributions: number; total_loans_outstanding: number; reserve_balance: number; available_balance: number; as_of: string; interest_collected: number; group_expenses: number; social_fund_balance: number; share_value: number }; Relationships: [] } }
    Functions: {
      create_group: { Args: { group_name: string; contribution: number; frequency: string; currency_code?: string }; Returns: string }
      claim_member: { Args: { target_member: string }; Returns: string }
      current_group_roles: { Args: { target_group: string }; Returns: string[] }
      current_group_permissions: { Args: { target_group: string }; Returns: string[] }
      has_group_permission: { Args: { target_group: string; required_permission: string }; Returns: boolean }
      assign_group_role: { Args: { target_group: string; target_email: string; target_role: string }; Returns: string }
      remove_group_role: { Args: { target_group: string; target_user: string; target_role: string }; Returns: string }
      transfer_group_chairperson: { Args: { target_group: string; target_email: string }; Returns: string }
      create_group_cycle: { Args: { target_group: string; cycle_name: string; cycle_start: string; cycle_end: string; share_unit_price: number; monthly_contribution: number; due_day: number; late_penalty_amount: number; max_loan: number | null; business_rules?: Json }; Returns: string }
      set_group_cycle_status: { Args: { target_group: string; target_cycle: string; next_status: string; cycle_end?: string | null }; Returns: string }
      generate_monthly_obligations: { Args: { target_group: string; target_cycle: string; obligation_period: string }; Returns: number }
      apply_contribution_penalties: { Args: { target_group: string; obligation_period: string }; Returns: number }
      accrue_monthly_interest: { Args: { target_group: string; interest_period: string }; Returns: number }
      close_financial_month: { Args: { target_group: string; closing_period: string; target_cycle?: string | null }; Returns: string }
      approve_financial_month: { Args: { target_closing: string }; Returns: string }
      reconcile_bank_transaction: { Args: { target_transaction: string; target_entity: string; target_entity_id: string }; Returns: string }
      calculate_cycle_profit: { Args: { target_group: string; target_cycle: string; profit_period?: string | null }; Returns: string }
      set_profit_calculation_status: { Args: { target_calculation: string; next_status: string }; Returns: string }
      submit_loan_draft: { Args: { target_loan: string }; Returns: string }
      update_loan_draft: { Args: { target_loan: string; requested_principal: number; requested_rate: number; requested_term: number; requested_purpose: string }; Returns: string }
      decide_loan: { Args: { target_loan: string; next_status: string; target_due_date?: string | null; decision_note?: string | null; disbursement_ref?: string | null }; Returns: string }
      cancel_approved_loan: { Args: { target_loan: string; cancellation_note?: string | null }; Returns: string }
      extend_active_loan: { Args: { target_loan: string; new_due_date: string }; Returns: string }
      notify_security_sign_in: { Args: Record<PropertyKey, never>; Returns: string }
      meeting_vote_summary: { Args: { target_meeting: string }; Returns: Array<{ decision_id: string; yes_count: number; no_count: number; abstain_count: number; my_vote: 'yes' | 'no' | 'abstain' | null }> }
      finalize_meeting_vote: { Args: { target_decision: string }; Returns: string }
    }
    Enums: { member_status: 'active' | 'inactive' | 'suspended'; contribution_status: 'pending' | 'verified' | 'rejected'; loan_status: 'pending' | 'approved' | 'rejected' | 'active' | 'repaid' | 'defaulted' }
    CompositeTypes: Record<string, never>
  }
}
