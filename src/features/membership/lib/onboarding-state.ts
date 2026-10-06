export type OnboardingStep =
  | 'group_information'
  | 'rules'
  | 'member_information'
  | 'shares'
  | 'contributions'
  | 'complete'

export type OnboardingSnapshot = {
  group: { id: string; contribution_amount: number; contribution_frequency: string }
  cycle: {
    id: string
    contribution_amount: number
    share_price: number
    rules: Record<string, unknown>
  } | null
  terms: { version: number; is_required: boolean } | null
  fields: { id: string; required: boolean }[]
  state: {
    group_information_viewed_at: string | null
    terms_completed_version: number | null
    accepted_terms_version: number | null
    field_responses: Record<string, unknown>
    fields_completed_at: string | null
    share_selection_cycle_id: string | null
    selected_share_units: number | null
    share_transaction_id?: string | null
    share_transaction_status?: string | null
    contribution_ack_cycle_id: string | null
    contribution_ack_amount: number | null
    contribution_ack_frequency: string | null
    contribution_ack_social_amount: number | null
    contribution_acknowledged_at: string | null
    completed_at: string | null
  } | null
}

function currentSocialAmount(cycle: OnboardingSnapshot['cycle']) {
  const value = Number(cycle?.rules.social_contribution_amount ?? 0)
  return Number.isFinite(value) ? value : 0
}

export function resolveNextOnboardingStep(snapshot: OnboardingSnapshot): OnboardingStep | null {
  const { state, terms, fields, cycle, group } = snapshot
  if (!state?.group_information_viewed_at) return 'group_information'
  if (
    terms &&
    (state.terms_completed_version !== terms.version ||
      (terms.is_required && state.accepted_terms_version !== terms.version))
  ) return 'rules'
  if (
    fields.length > 0 &&
    (!state.fields_completed_at || fields.some((field) => !(field.id in (state.field_responses ?? {}))))
  ) {
    return 'member_information'
  }
  const shareSelection = cycle?.rules.member_share_selection as
    | { enabled?: boolean; min_units?: number; max_units?: number | null; required_units?: number }
    | undefined
  if (
    cycle &&
    cycle.share_price > 0 &&
    shareSelection?.enabled &&
    (state.share_selection_cycle_id !== cycle.id ||
      state.selected_share_units === null ||
      Number(state.selected_share_units) < Number(shareSelection.min_units ?? 1) ||
      Number(state.selected_share_units) < Number(shareSelection.required_units ?? shareSelection.min_units ?? 1) ||
      (shareSelection.max_units != null && Number(state.selected_share_units) > Number(shareSelection.max_units)) ||
      !state.share_transaction_id ||
      !['pending', 'verified'].includes(state.share_transaction_status ?? ''))
  ) {
    return 'shares'
  }
  const socialAmount = currentSocialAmount(cycle)
  if (
    state.contribution_acknowledged_at === null ||
    state.contribution_ack_cycle_id !== (cycle?.id ?? null) ||
    Number(state.contribution_ack_amount) !== Number(cycle?.contribution_amount ?? group.contribution_amount) ||
    state.contribution_ack_frequency !== group.contribution_frequency ||
    Number(state.contribution_ack_social_amount) !== socialAmount
  ) {
    return 'contributions'
  }
  return state.completed_at ? null : 'complete'
}
