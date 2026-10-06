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
      app_password_credentials: Table<{
        user_id: string
        password_hash: string
        password_changed_at: string
        updated_at: string
      }>
      app_sessions: Table<{
        id: string
        user_id: string
        token_hash: string
        expires_at: string
        created_at: string
        last_seen_at: string
        mfa_verified_until: string | null
        revoked_at: string | null
        ip_address: string | null
        user_agent: string | null
      }>
      app_password_reset_tokens: Table<{
        id: string
        user_id: string
        token_hash: string
        expires_at: string
        used_at: string | null
        created_at: string
      }>
      app_auth_rate_limits: Table<{
        scope: string
        bucket_hash: string
        window_started_at: string
        request_count: number
      }>
      app_totp_factors: Table<{
        user_id: string
        secret_ciphertext: string
        status: 'pending' | 'verified'
        created_at: string
        verified_at: string | null
        last_used_step: number | null
      }>
      app_login_challenges: Table<{
        id: string
        user_id: string
        token_hash: string
        expires_at: string
        attempts: number
        consumed_at: string | null
        remember_me: boolean
        created_at: string
      }>
      groups: Table<Group & { reserve_balance: number }>
      members: Table<Member & { legacy_role: string }>
      group_membership_terms: Table<{
        id: string
        group_id: string
        version: number
        title: string
        body: string
        is_required: boolean
        is_current: boolean
        created_by: string
        created_at: string
      }>
      group_member_fields: Table<{
        id: string
        group_id: string
        label: string
        description: string
        field_type:
          'text' | 'textarea' | 'number' | 'date' | 'phone' | 'select' | 'radio' | 'checkbox'
        is_required: boolean
        options: Json[]
        is_active: boolean
        display_order: number
        created_by: string
        created_at: string
        updated_at: string
      }>
      member_onboarding: Table<{
        member_id: string
        group_id: string
        group_information_viewed_at: string | null
        terms_completed_version: number | null
        accepted_terms_version: number | null
        terms_accepted_at: string | null
        field_responses: Record<string, Json>
        fields_completed_at: string | null
        share_selection_cycle_id: string | null
        selected_share_units: number | null
        share_transaction_id: string | null
        contribution_ack_cycle_id: string | null
        contribution_ack_amount: number | null
        contribution_ack_frequency: string | null
        contribution_ack_social_amount: number | null
        contribution_acknowledged_at: string | null
        completed_at: string | null
        created_at: string
        updated_at: string
      }>
      group_system_controls: Table<{
        group_id: string
        status: 'normal' | 'limited' | 'maintenance' | 'locked'
        message: string | null
        disabled_modules: string[]
        changed_by: string | null
        updated_at: string
      }>
      group_role_catalog: Table<{ role_key: GroupRole; label: string; role_domain: string }>
      permissions: Table<{ permission_key: string; label: string; permission_domain: string }>
      role_permissions: Table<{ role_key: GroupRole; permission_key: string }>
      group_role_assignments: Table<{
        group_id: string
        user_id: string
        role_key: GroupRole
        user_email: string | null
        granted_by: string | null
        granted_at: string
      }>
      contributions: Table<Contribution>
      loans: Table<
        Loan & {
          cycle_id: string | null
          outstanding_interest: number
          is_draft: boolean
          rejection_reason: string | null
          disbursement_reference: string | null
          disbursed_at: string | null
        }
      >
      loan_repayments: Table<{
        id: string
        loan_id: string
        group_id: string
        amount: number
        principal_amount: number
        interest_amount: number
        status: 'pending' | 'verified' | 'rejected'
        created_by: string | null
        received_by: string
        received_at: string
        verified_by: string | null
        verified_at: string | null
        payment_method: 'cash' | 'bank' | 'mobile_money' | 'other'
        reference: string | null
      }>
      savings_adjustments: Table<{
        id: string
        group_id: string
        amount: number
        reason: string
        created_by: string
        created_at: string
      }>
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
      meeting_votes: Table<{
        id: string
        decision_id: string
        member_id: string
        vote: 'yes' | 'no' | 'abstain'
        cast_at: string
      }>
      attendance: Table<Attendance>
      notifications: Table<NotificationRecord>
      group_announcements: Table<{
        id: string
        group_id: string
        title: string
        body: string
        published_at: string | null
        created_by: string
        created_at: string
      }>
      join_requests: Table<{
        id: string
        group_id: string
        user_id: string
        message: string | null
        status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'superseded'
        reviewed_by: string | null
        reviewed_at: string | null
        decision_message: string | null
        applicant_name: string | null
        applicant_email: string | null
        created_at: string
      }>
      group_invitations: Table<{
        id: string
        group_id: string
        email: string
        token_hash: string
        status:
          'pending' | 'sent' | 'delivery_failed' | 'accepted' | 'declined' | 'expired' | 'revoked'
        invited_by: string
        invitee_name: string | null
        invitee_user_id: string | null
        expires_at: string
        accepted_by: string | null
        accepted_at: string | null
        declined_at: string | null
        revoked_at: string | null
        sent_at: string | null
        last_delivery_attempt_at: string | null
        delivery_attempts: number
        delivery_window_started_at: string | null
        created_at: string
        updated_at: string
      }>
      chat_threads: Table<{
        id: string
        group_id: string
        kind: 'private' | 'official' | 'committee' | 'group'
        title: string | null
        created_by: string
        created_at: string
      }>
      chat_thread_members: Table<{ thread_id: string; user_id: string; joined_at: string }>
      chat_messages: Table<{
        id: string
        thread_id: string
        sender_id: string
        body: string
        edited_at: string | null
        deleted_at: string | null
        moderated_by: string | null
        created_at: string
      }>
      audit_logs: Table<{
        id: number
        group_id: string | null
        actor_id: string | null
        action: string
        entity: string
        entity_id: string | null
        details: Json
        permission_used: string | null
        authority_roles: string[]
        before_data: Json | null
        after_data: Json | null
        created_at: string
      }>
    }
    Views: {
      savings_summary: {
        Row: {
          group_id: string
          currency: string
          total_contributions: number
          total_loans_outstanding: number
          reserve_balance: number
          available_balance: number
          as_of: string
          interest_collected: number
          group_expenses: number
          social_fund_balance: number
          share_value: number
        }
        Relationships: []
      }
    }
    Functions: {
      issue_email_verification_code: {
        Args: { target_code_hash: string; target_ip_hash: string }
        Returns: boolean
      }
      verify_email_verification_code: {
        Args: { target_email: string; target_code_hash: string }
        Returns: boolean
      }
      create_application_account: {
        Args: {
          target_user: string
          target_email: string
          target_full_name: string
          target_phone: string
          target_password_hash: string
          target_session_hash: string
          target_session_expiry: string
          target_ip: string
          target_user_agent: string
          email_is_preverified?: boolean
        }
        Returns: string
      }
      create_invited_application_account: {
        Args: {
          target_user: string
          target_email: string
          target_full_name: string
          target_phone: string
          target_password_hash: string
          target_session_hash: string
          target_session_expiry: string
          target_ip: string
          target_user_agent: string
          target_invitation_hash: string
        }
        Returns: Json
      }
      save_group_onboarding_config: {
        Args: {
          target_group: string
          target_terms_title: string
          target_terms_body: string
          target_terms_required: boolean
          target_fields: Json
        }
        Returns: Json
      }
      save_member_onboarding_step: {
        Args: { target_group: string; target_step: string; target_payload: Json }
        Returns: Json
      }
      set_group_system_controls: {
        Args: {
          target_group: string
          target_status: 'normal' | 'limited' | 'maintenance' | 'locked'
          target_message: string | null
          target_disabled_modules: string[]
        }
        Returns: Json
      }
      member_onboarding_is_complete: { Args: { target_group: string }; Returns: boolean }
      consume_app_auth_rate_limit: {
        Args: {
          target_scope: string
          target_bucket_hash: string
          max_requests: number
          window_seconds: number
        }
        Returns: boolean
      }
      consume_password_reset_token: {
        Args: { target_token_hash: string; target_password_hash: string }
        Returns: boolean
      }
      change_application_password: {
        Args: { target_user: string; target_session: string; target_password_hash: string }
        Returns: boolean
      }
      fail_application_login_challenge: { Args: { target_token_hash: string }; Returns: boolean }
      complete_application_login_challenge: {
        Args: {
          target_token_hash: string
          target_totp_step: number
          target_session_hash: string
          target_session_expiry: string
          target_ip: string
          target_user_agent: string
        }
        Returns: string | null
      }
      disable_application_totp_factor: {
        Args: { target_user: string; target_totp_step: number }
        Returns: boolean
      }
      allow_password_recovery_request: {
        Args: { target_email_hash: string; target_ip_hash: string }
        Returns: boolean
      }
      current_account_email_verified: { Args: Record<PropertyKey, never>; Returns: boolean }
      create_group: {
        Args: {
          group_name: string
          contribution: number
          frequency: string
          currency_code: string
          group_description: string
          group_location: string | null
          is_discoverable: boolean
        }
        Returns: string
      }
      request_group_join: {
        Args: { target_group: string; request_message?: string | null }
        Returns: string
      }
      create_group_invitation: {
        Args: {
          target_group: string
          target_email: string
          target_token_hash: string
          target_invitee_name?: string | null
        }
        Returns: string
      }
      resend_group_invitation: {
        Args: { target_invitation: string; target_token_hash: string }
        Returns: string
      }
      revoke_group_invitation: { Args: { target_invitation: string }; Returns: boolean }
      mark_group_invitation_delivery: {
        Args: { target_invitation: string; delivery_succeeded: boolean }
        Returns: boolean
      }
      get_group_invitation_status: { Args: { target_token_hash: string }; Returns: Json }
      decline_group_invitation: { Args: { target_token_hash: string }; Returns: string }
      accept_group_invitation: { Args: { target_token_hash: string }; Returns: Json }
      review_group_join_request: {
        Args: { target_request: string; decision: string; applicant_message?: string | null }
        Returns: string | null
      }
      create_member_official_thread: {
        Args: { target_group: string; thread_title: string; first_message: string }
        Returns: string
      }
      claim_member: { Args: { target_member: string }; Returns: string }
      current_group_roles: { Args: { target_group: string }; Returns: string[] }
      current_group_permissions: { Args: { target_group: string }; Returns: string[] }
      has_group_permission: {
        Args: { target_group: string; required_permission: string }
        Returns: boolean
      }
      assign_group_role: {
        Args: { target_group: string; target_email: string; target_role: string }
        Returns: string
      }
      remove_group_role: {
        Args: { target_group: string; target_user: string; target_role: string }
        Returns: string
      }
      transfer_group_chairperson: {
        Args: { target_group: string; target_email: string }
        Returns: string
      }
      create_group_cycle: {
        Args: {
          target_group: string
          cycle_name: string
          cycle_start: string
          cycle_end: string
          share_unit_price: number
          monthly_contribution: number
          due_day: number
          late_penalty_amount: number
          max_loan: number | null
          business_rules?: Json
        }
        Returns: string
      }
      set_group_cycle_status: {
        Args: {
          target_group: string
          target_cycle: string
          next_status: string
          cycle_end?: string | null
        }
        Returns: string
      }
      generate_monthly_obligations: {
        Args: { target_group: string; target_cycle: string; obligation_period: string }
        Returns: number
      }
      apply_contribution_penalties: {
        Args: { target_group: string; obligation_period: string }
        Returns: number
      }
      accrue_monthly_interest: {
        Args: { target_group: string; interest_period: string }
        Returns: number
      }
      close_financial_month: {
        Args: { target_group: string; closing_period: string; target_cycle?: string | null }
        Returns: string
      }
      approve_financial_month: { Args: { target_closing: string }; Returns: string }
      reconcile_bank_transaction: {
        Args: { target_transaction: string; target_entity: string; target_entity_id: string }
        Returns: string
      }
      calculate_cycle_profit: {
        Args: { target_group: string; target_cycle: string; profit_period?: string | null }
        Returns: string
      }
      record_committee_profit_decision: {
        Args: {
          target_calculation: string
          decision_kind: string
          decision_reference: string
          decision_reason: string
          proposed_allocations: Json
        }
        Returns: string
      }
      set_profit_calculation_status: {
        Args: { target_calculation: string; next_status: string }
        Returns: string
      }
      submit_loan_draft: { Args: { target_loan: string }; Returns: string }
      update_loan_draft: {
        Args: {
          target_loan: string
          requested_principal: number
          requested_term: number
          requested_purpose: string
        }
        Returns: string
      }
      decide_loan: {
        Args: {
          target_loan: string
          next_status: string
          target_due_date?: string | null
          decision_note?: string | null
          disbursement_ref?: string | null
        }
        Returns: string
      }
      cancel_approved_loan: {
        Args: { target_loan: string; cancellation_note?: string | null }
        Returns: string
      }
      extend_active_loan: { Args: { target_loan: string; new_due_date: string }; Returns: string }
      notify_security_sign_in: { Args: Record<PropertyKey, never>; Returns: string }
      meeting_vote_summary: {
        Args: { target_meeting: string }
        Returns: Array<{
          decision_id: string
          yes_count: number
          no_count: number
          abstain_count: number
          my_vote: 'yes' | 'no' | 'abstain' | null
        }>
      }
      finalize_meeting_vote: { Args: { target_decision: string }; Returns: string }
    }
    Enums: {
      member_status: 'active' | 'inactive' | 'suspended'
      contribution_status: 'pending' | 'verified' | 'rejected'
      loan_status: 'pending' | 'approved' | 'rejected' | 'active' | 'repaid' | 'defaulted'
    }
    CompositeTypes: Record<string, never>
  }
}
