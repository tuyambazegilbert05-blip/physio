'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, CalendarClock } from 'lucide-react'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { apiRequest } from '@/lib/api'

type ActiveCycle = {
  id: string
  cycle_number: number
  name: string
  starts_on: string
  ends_on: string
  status: 'open'
}

function getCycleProgress(cycle: ActiveCycle) {
  const start = Date.parse(`${cycle.starts_on}T00:00:00Z`)
  const end = Date.parse(`${cycle.ends_on}T23:59:59Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100)))
}

function ProgressRing({ progress }: { progress: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Cycle is ${progress}% through its scheduled dates`}
      className="h-9 w-9 shrink-0 -rotate-90 motion-safe:animate-[spin_12s_linear_infinite] motion-reduce:animate-none"
    >
      <defs>
        <linearGradient id="cycle-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2437F5" />
          <stop offset="100%" stopColor="#B026FF" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="16" fill="none" stroke="#E9E5FF" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="url(#cycle-progress-gradient)"
        strokeLinecap="round"
        strokeWidth="4"
        pathLength="100"
        strokeDasharray="100"
        strokeDashoffset={100 - progress}
      />
    </svg>
  )
}

export function CycleIndicator() {
  const { group, loading: groupLoading } = useActiveGroup()
  const [cycleState, setCycleState] = useState<{
    groupId: string
    cycle: ActiveCycle | null
    unavailable: boolean
  } | null>(null)

  useEffect(() => {
    if (!group) return
    let active = true
    apiRequest<ActiveCycle | null>(`/api/cycles/active?group_id=${encodeURIComponent(group.id)}`)
      .then((activeCycle) => {
        if (active) setCycleState({ groupId: group.id, cycle: activeCycle, unavailable: false })
      })
      .catch(() => {
        if (active) setCycleState({ groupId: group.id, cycle: null, unavailable: true })
      })

    return () => {
      active = false
    }
  }, [group])

  const currentState = group && cycleState?.groupId === group.id ? cycleState : null
  const cycle = currentState?.cycle ?? null
  const unavailable = currentState?.unavailable ?? false
  const loading = Boolean(group && !currentState)
  const progress = cycle ? getCycleProgress(cycle) : 0

  const status =
    groupLoading || loading
      ? 'Checking cycle…'
      : unavailable
        ? 'Cycle status unavailable'
        : !group
          ? 'Choose a group'
          : cycle
            ? 'Cycle active'
            : 'No active cycle'
  const detail =
    groupLoading || loading
      ? 'Loading current group status'
      : unavailable
        ? 'Open operations to check again'
        : cycle
          ? `${progress}% through cycle dates`
          : group
            ? 'Open operations to start a cycle'
            : 'Select a group to get started'

  return (
    <Link
      href="/dashboard/operations"
      aria-label={`${status}. ${detail}. Open operations.`}
      className="group flex items-center gap-3 rounded-[20px] border border-indigo-100/80 bg-white/75 px-3.5 py-3 shadow-[0_10px_28px_-24px_rgba(36,55,245,0.5)] transition hover:border-violet-200 hover:bg-white hover:shadow-[0_14px_34px_-22px_rgba(83,55,220,0.34)]"
    >
      {cycle && !loading && !groupLoading ? (
        <ProgressRing progress={progress} />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-violet-100 text-[#7B3FF2]">
          {unavailable ? <Activity className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-extrabold text-[#081233]">{status}</span>
        <span className="mt-0.5 block truncate text-[9px] font-medium text-slate-500">
          {detail}
        </span>
      </span>
    </Link>
  )
}
