export type Group = { id: string; name: string; currency: string; contribution_amount: number; contribution_frequency: 'weekly' | 'monthly' | 'quarterly'; created_by: string; created_at: string; updated_at: string }
export type { GroupRole } from './role'
