import { apiRequest } from '@/lib/api'
import type { Member } from '@/types/member'
export const memberService = {
  list: (groupId: string) => apiRequest<Member[]>(`/api/members?group_id=${encodeURIComponent(groupId)}`),
  create: (values: Partial<Member> & Pick<Member, 'group_id' | 'full_name'>) => apiRequest<Member>('/api/members', { method: 'POST', body: JSON.stringify(values) }),
  claim: (memberId: string) => apiRequest<string>('/api/members/claim', { method: 'POST', body: JSON.stringify({ member_id: memberId }) }),
}
