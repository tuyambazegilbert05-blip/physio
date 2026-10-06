import { apiRequest } from '@/lib/api'
import type { Group } from '@/types/group'
import type { GroupCreateInput } from '@/features/groups/schemas/group.schema'

export type GroupInitializationResult = {
  group_id: string
  name: string
  cycle_id: string
  cycle_name: string
  starts_on: string
  ends_on: string
  share_price: number
  social_contribution: number
  member_id: string
  roles: string[]
}

export type CreatedGroupResponse = Group & {
  initialization?: GroupInitializationResult
}

export const groupService = {
  list: () => apiRequest<Group[]>('/api/groups'),
  create: (values: Partial<GroupCreateInput> & { name: string }) =>
    apiRequest<CreatedGroupResponse>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(values),
    }),
  update: (values: {
    group_id: string
    name: string
    currency: string
    contribution_amount: number
    contribution_frequency: Group['contribution_frequency']
  }) => apiRequest<Group>('/api/groups', { method: 'PATCH', body: JSON.stringify(values) }),
}
