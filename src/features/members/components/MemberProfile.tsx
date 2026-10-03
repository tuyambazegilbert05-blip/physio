import type { Member } from '@/types/member'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/formatters'
export function MemberProfile({ member }: { member: Member }) {
  return <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6"><Avatar name={member.full_name} className="size-14 text-lg" /><div><h1 className="text-xl font-semibold">{member.full_name}</h1><p className="text-sm capitalize text-slate-600">Member · {member.status}</p><p className="mt-1 text-xs text-slate-500">Joined {formatDate(member.joined_at)}</p></div></section>
}
