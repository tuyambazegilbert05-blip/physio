export type MembershipRequestState = 'pending' | 'approved' | 'rejected' | 'withdrawn'

export type OwnMembershipRequest = {
  id: string
  group_id: string
  group_name: string
  message: string | null
  status: MembershipRequestState
  reviewed_at: string | null
  decision_message: string | null
  created_at: string
}

export type DiscoverableGroup = {
  id: string
  name: string
  description: string
  location: string | null
  currency: string
  contribution_frequency: string
}

export type MembershipAccessData = {
  profile: { full_name: string; email: string }
  requests: OwnMembershipRequest[]
  groups: DiscoverableGroup[]
}

export type MembershipReviewRequest = {
  id: string
  group_id: string
  user_id: string
  message: string | null
  status: MembershipRequestState
  reviewed_at: string | null
  decision_message: string | null
  applicant_name: string | null
  applicant_email: string | null
  created_at: string
}
