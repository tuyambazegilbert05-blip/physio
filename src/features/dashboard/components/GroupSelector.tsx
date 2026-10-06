'use client'

import { useRouter } from 'next/navigation'
import type { Group } from '@/types/group'
import { ChevronDown } from 'lucide-react'
import { persistActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'

export function GroupSelector({
  groups,
  currentId,
  returnTo = '/dashboard',
}: {
  groups: Pick<Group, 'id' | 'name'>[]
  currentId: string
  returnTo?: string
}) {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
        Active Group
      </span>
      <div className="relative">
        <select
          value={currentId}
          onChange={(event) => {
            const nextGroupId = event.target.value
            persistActiveGroup(nextGroupId)
            router.push(`${returnTo}?group=${encodeURIComponent(nextGroupId)}`)
          }}
          className="min-w-52 appearance-none cursor-pointer rounded-2xl border border-indigo-100 bg-white/90 px-4 py-3 pr-10 text-sm font-bold text-[#081233] shadow-[0_8px_22px_-20px_rgba(36,55,245,0.6)] outline-none transition hover:border-violet-200 focus:border-[#7B3FF2]/50 focus:ring-4 focus:ring-[#7B3FF2]/10"
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B3FF2]" />
      </div>
    </div>
  )
}
