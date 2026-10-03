export type Meeting = { id: string; group_id: string; title: string; agenda: string | null; location: string | null; starts_at: string; ends_at: string | null; minutes?: string | null; created_by: string; created_at: string }
export type Attendance = { id: string; meeting_id: string; member_id: string; present: boolean; recorded_by: string; recorded_at: string }
export type MeetingVoteChoice = 'yes' | 'no' | 'abstain'
export type MeetingDecisionOutcome = 'approved' | 'rejected' | 'deferred'
export type MeetingDecision = {
  id: string
  meeting_id: string
  title: string
  description: string | null
  voting_open: boolean
  voting_closes_at: string | null
  outcome: MeetingDecisionOutcome | null
  created_by: string
  created_at: string
}
export type MeetingVoteSummary = {
  decision_id: string
  yes_count: number
  no_count: number
  abstain_count: number
  my_vote: MeetingVoteChoice | null
}
export type MeetingDecisionRecord = MeetingDecision & MeetingVoteSummary
