import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveNextOnboardingStep, type OnboardingSnapshot } from '../src/features/membership/lib/onboarding-state.ts'

function snapshot(): OnboardingSnapshot {
  return {
    group: { id: 'group-a', contribution_amount: 10000, contribution_frequency: 'monthly' },
    cycle: {
      id: 'cycle-a',
      contribution_amount: 10000,
      share_price: 5000,
      rules: { social_contribution_amount: 1000 },
    },
    terms: { version: 1, is_required: true },
    fields: [{ id: 'occupation', required: true }],
    state: {
      group_information_viewed_at: null,
      terms_completed_version: null,
      accepted_terms_version: null,
      field_responses: {},
      fields_completed_at: null,
      share_selection_cycle_id: null,
      selected_share_units: null,
      share_transaction_id: null,
      contribution_ack_cycle_id: null,
      contribution_ack_amount: null,
      contribution_ack_frequency: null,
      contribution_ack_social_amount: null,
      contribution_acknowledged_at: null,
      completed_at: null,
    },
  }
}

test('membership onboarding advances through the same required steps to completion', () => {
  const flow = snapshot()
  assert.equal(resolveNextOnboardingStep(flow), 'group_information')
  flow.state!.group_information_viewed_at = '2026-10-05T08:00:00Z'
  assert.equal(resolveNextOnboardingStep(flow), 'rules')
  flow.state!.terms_completed_version = 1
  flow.state!.accepted_terms_version = 1
  assert.equal(resolveNextOnboardingStep(flow), 'member_information')
  flow.state!.field_responses = { occupation: 'Farmer' }
  flow.state!.fields_completed_at = '2026-10-05T08:02:00Z'
  flow.cycle!.rules.member_share_selection = { enabled: true, min_units: 1, max_units: 5, required_units: 2 }
  assert.equal(resolveNextOnboardingStep(flow), 'shares')
  flow.state!.share_selection_cycle_id = 'cycle-a'
  flow.state!.selected_share_units = 2
  flow.state!.share_transaction_id = 'share-a'
  flow.state!.share_transaction_status = 'pending'
  assert.equal(resolveNextOnboardingStep(flow), 'contributions')
  flow.state!.contribution_ack_cycle_id = 'cycle-a'
  flow.state!.contribution_ack_amount = 10000
  flow.state!.contribution_ack_frequency = 'monthly'
  flow.state!.contribution_ack_social_amount = 1000
  flow.state!.contribution_acknowledged_at = '2026-10-05T08:03:00Z'
  assert.equal(resolveNextOnboardingStep(flow), 'complete')
  flow.state!.completed_at = '2026-10-05T08:04:00Z'
  assert.equal(resolveNextOnboardingStep(flow), null)
})

test('updated requirements, share limits, and rejected share requests reopen onboarding', () => {
  const flow = snapshot()
  flow.state!.group_information_viewed_at = '2026-10-05T08:00:00Z'
  flow.state!.terms_completed_version = 1
  flow.state!.accepted_terms_version = 1
  flow.state!.field_responses = { occupation: 'Farmer' }
  flow.state!.fields_completed_at = '2026-10-05T08:02:00Z'
  flow.cycle!.rules.member_share_selection = { enabled: true, min_units: 1, max_units: 5, required_units: 2 }
  flow.state!.share_selection_cycle_id = 'cycle-a'
  flow.state!.selected_share_units = 2
  flow.state!.share_transaction_id = 'share-a'
  flow.state!.share_transaction_status = 'rejected'
  assert.equal(resolveNextOnboardingStep(flow), 'shares')
  flow.state!.share_transaction_status = 'pending'
  flow.cycle!.rules.member_share_selection = { enabled: true, min_units: 1, max_units: 5, required_units: 3 }
  assert.equal(resolveNextOnboardingStep(flow), 'shares')
  flow.cycle!.rules.member_share_selection = { enabled: true, min_units: 1, max_units: 5, required_units: 2 }
  flow.state!.contribution_ack_cycle_id = 'cycle-old'
  assert.equal(resolveNextOnboardingStep(flow), 'contributions')
})
