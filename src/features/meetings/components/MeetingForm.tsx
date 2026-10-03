'use client'

import { useState, type FormEvent } from 'react'
import { meetingService } from '@/features/meetings/services/meeting.service'
import { meetingCreateSchema } from '@/features/meetings/schemas/meeting.schema'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { Meeting } from '@/types/meeting'

export function MeetingForm({ groupId, onCreated }: { groupId: string; onCreated?: (meeting: Meeting) => void }) {
  const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement)
    const startValue = String(form.get('starts_at') ?? '')
    const endValue = String(form.get('ends_at') ?? '')
    const start = new Date(startValue)
    const end = endValue ? new Date(endValue) : null
    if (!startValue || Number.isNaN(start.valueOf()) || (end && Number.isNaN(end.valueOf()))) { setError('Enter valid meeting dates.'); return }
    if (end && end <= start) { setError('The end time must be after the start time.'); return }
    const parsed = meetingCreateSchema.safeParse({ group_id: groupId, title: form.get('title'), agenda: form.get('agenda') || null, location: form.get('location') || null, starts_at: start.toISOString(), ends_at: end?.toISOString() ?? null })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check meeting details.'); return }
    setPending(true); setError('')
    try { const meeting = await meetingService.create(parsed.data as any); onCreated?.(meeting); formElement.reset() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create meeting.') }
    finally { setPending(false) }
  }
  return <form onSubmit={submit} className="grid gap-4"><FormError message={error} /><FormField htmlFor="meeting-title" label="Title"><Input id="meeting-title" name="title" required /></FormField><FormField htmlFor="meeting-start" label="Starts at"><Input id="meeting-start" name="starts_at" type="datetime-local" required /></FormField><FormField htmlFor="meeting-end" label="Ends at"><Input id="meeting-end" name="ends_at" type="datetime-local" /></FormField><FormField htmlFor="meeting-location" label="Location"><Input id="meeting-location" name="location" /></FormField><FormField htmlFor="meeting-agenda" label="Agenda"><Textarea id="meeting-agenda" name="agenda" /></FormField><FormSubmit pending={pending}>Schedule meeting</FormSubmit></form>
}
