export type ContributionStatus = 'pending' | 'verified' | 'rejected'
export type Contribution = { id: string; group_id: string; member_id: string; amount: number; contribution_type: 'regular' | 'social' | 'special'; period: string; status: ContributionStatus; reference: string | null; received_at: string | null; verified_by: string | null; verified_at: string | null; created_at: string }
