import type { UserProfile as Profile } from '@/types/user'
import { Avatar } from '@/components/ui/Avatar'
export function UserProfile({ profile }: { profile: Profile }) {
  return <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5"><Avatar name={profile.full_name} src={profile.avatar_url ?? undefined} className="size-14" /><div><h2 className="font-semibold">{profile.full_name}</h2><p className="text-sm text-slate-500">{profile.phone ?? 'No phone number added'}</p></div></section>
}
