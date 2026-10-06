'use client'

import { useState, type FormEvent } from 'react'
import { FormError } from '@/components/forms/FormError'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Textarea } from '@/components/ui/Textarea'
import { apiRequest } from '@/lib/api'

export function MeetingMinutesPanel({ meetingId, initialMinutes, canManage }: { meetingId: string; initialMinutes: string; canManage: boolean }) {
  const [minutes, setMinutes] = useState(initialMinutes)
  const [savedMinutes, setSavedMinutes] = useState(initialMinutes)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setMessage('')
    try {
      const meeting = await apiRequest<{ minutes: string | null }>(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ minutes: minutes.trim() || null }),
      })
      const next = meeting.minutes ?? ''
      setMinutes(next)
      setSavedMinutes(next)
      setMessage('Meeting minutes saved.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the meeting minutes.')
    } finally {
      setPending(false)
    }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="font-semibold text-slate-900">Meeting minutes</h2>
    <p className="mt-1 text-sm text-slate-600">Keep an ongoing record of attendance notes, discussions, resolutions, and follow-up actions.</p>
    {canManage ? <form onSubmit={save} className="mt-4 space-y-3">
      <FormError message={error} />
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      <Textarea value={minutes} onChange={(event) => setMinutes(event.target.value)} maxLength={20000} placeholder="Add approved minutes or follow-up notes…" />
      <FormSubmit pending={pending} disabled={minutes === savedMinutes}>Save minutes</FormSubmit>
    </form> : <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{savedMinutes || 'Minutes have not been added yet.'}</p>}
  </section>
}
