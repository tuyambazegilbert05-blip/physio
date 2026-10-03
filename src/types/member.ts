export type MemberStatus = 'active' | 'inactive' | 'suspended'
export type Member = { id: string; group_id: string; user_id: string | null; full_name: string; email: string | null; phone: string | null; status: MemberStatus; joined_at: string; created_at: string; updated_at: string }
