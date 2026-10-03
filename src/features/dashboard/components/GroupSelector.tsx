'use client'

import { useRouter } from 'next/navigation'
import type { Group } from '@/types/group'
import { ChevronDown } from 'lucide-react'

export function GroupSelector({
  groups,
  currentId,
}: {
  groups: Pick<Group, 'id' | 'name'>[]
  currentId: string
}) {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Active Group
      </span>
      <div className="relative">
        <select
          value={currentId}
          onChange={(event) =>
            router.push(`/dashboard?group=${encodeURIComponent(event.target.value)}`)
          }
          className="appearance-none cursor-pointer rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-2.5 pr-9 text-xs sm:text-sm font-semibold text-[#081233] shadow-xs transition-all hover:border-[#2437F5]/50 focus:border-[#2437F5] focus:outline-none focus:ring-3 focus:ring-[#2437F5]/10"
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>
    </div>
  )
}
