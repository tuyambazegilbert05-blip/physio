import type { Member } from '@/types/member'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
export function MemberCard({ member }: { member: Member }) {
  return <article className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"><Avatar name={member.full_name} /><div className="min-w-0 flex-1"><h3 className="truncate font-medium">{member.full_name}</h3><p className="truncate text-sm text-slate-500">{member.email ?? member.phone ?? 'No contact details'}</p></div><Badge>{member.status}</Badge></article>
}
