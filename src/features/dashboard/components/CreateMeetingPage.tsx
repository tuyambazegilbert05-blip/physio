'use client'

import { MeetingForm } from '@/features/meetings/components/MeetingForm'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'

export function CreateMeetingPage() {
  const { group, loading, error } = useActiveGroup()
  if (loading) return <p className="p-8">Loading group…</p>
  if (error) return <p role="alert" className="p-8 text-red-700">{error}</p>
  if (!group) return <p className="p-8">Create a group before scheduling a meeting.</p>
  return <section className="mx-auto max-w-3xl space-y-5 p-6"><div><p className="text-sm text-slate-500">{group.name}</p><h1 className="text-2xl font-semibold">Schedule a meeting</h1></div><MeetingForm groupId={group.id} /></section>
}
