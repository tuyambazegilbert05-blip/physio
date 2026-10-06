'use client'

import { MeetingForm } from '@/features/meetings/components/MeetingForm'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'

export function CreateMeetingPage() {
  const { group, loading, error } = useActiveGroup()
  if (loading) return <p className="p-8 text-sm text-slate-500">Loading group…</p>
  if (error)
    return (
      <p role="alert" className="p-8 text-sm text-rose-600">
        {error}
      </p>
    )
  if (!group)
    return <p className="p-8 text-sm text-slate-500">Create a group before scheduling a meeting.</p>

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
          {group.name}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
          Schedule a meeting
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Keep members informed with the next group meeting’s time, location, and agenda.
        </p>
      </header>
      <section className="rounded-[28px] border border-white/90 bg-white/88 p-5 shadow-[0_20px_56px_-40px_rgba(36,55,245,0.55)] backdrop-blur-xl sm:p-7">
        <MeetingForm groupId={group.id} />
      </section>
    </main>
  )
}
