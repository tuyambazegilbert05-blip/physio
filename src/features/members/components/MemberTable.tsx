import { DataTable } from '@/components/tables/DataTable'
import type { Member } from '@/types/member'
export function MemberTable({ members }: { members: Member[] }) {
  return <DataTable rows={members} rowKey="id" columns={[{ key: 'full_name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'status', label: 'Membership' }]} />
}
