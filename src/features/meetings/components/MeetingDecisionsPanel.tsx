'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import type { MeetingDecisionRecord, MeetingVoteChoice } from '@/types/meeting'
import { FormError } from '@/components/forms/FormError'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Textarea } from '@/components/ui/Textarea'
import { MeetingMinutesPanel } from '@/features/meetings/components/MeetingMinutesPanel'
import { MeetingAttendancePanel } from '@/features/meetings/components/MeetingAttendancePanel'
import type { Meeting } from '@/types/meeting'

const voteLabels: Record<MeetingVoteChoice, string> = { yes: 'Yes', no: 'No', abstain: 'Abstain' }

export function MeetingDecisionsPanel({ meetingId, canManage, canVote }: { meetingId: string; canManage: boolean; canVote: boolean }) {
  const [decisions, setDecisions] = useState<MeetingDecisionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [meetingMinutes, setMeetingMinutes] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    const data = await apiRequest<MeetingDecisionRecord[]>(`/api/meetings/${meetingId}/decisions`)
    setDecisions(data)
  }, [meetingId])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      apiRequest<MeetingDecisionRecord[]>(`/api/meetings/${meetingId}/decisions`),
      apiRequest<Meeting>(`/api/meetings/${meetingId}`),
    ])
      .then(([data, meeting]) => {
        if (active) {
          setDecisions(data)
          setMeetingMinutes(meeting.minutes ?? '')
        }
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load meeting decisions.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [meetingId])

  async function submitAction(payload: Record<string, unknown>) {
    setPending(true)
    setError('')
    try {
      await apiRequest(`/api/meetings/${meetingId}/decisions`, { method: 'POST', body: JSON.stringify(payload) })
      try {
        await refresh()
      } catch {
        setError('The action was saved, but the latest meeting data could not be refreshed.')
      }
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The meeting action could not be completed.')
      return false
    } finally {
      setPending(false)
    }
  }

  async function createDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const created = await submitAction({
      action: 'create',
      title,
      description: description.trim() || null,
      voting_closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    })
    if (created) {
      setTitle('')
      setDescription('')
      setClosesAt('')
    }
  }

  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Meeting decisions</h2>
      <p className="mt-1 text-sm text-slate-600">Record proposals, collect member votes, and keep the final outcome with the meeting.</p>
    </div>
    {!loading && <MeetingMinutesPanel meetingId={meetingId} initialMinutes={meetingMinutes} canManage={canManage} />}
    <MeetingAttendancePanel meetingId={meetingId} canManage={canManage} />
    <FormError message={error} />

    {canManage && <form onSubmit={createDecision} className="grid gap-3 rounded-lg bg-slate-50 p-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">Decision or proposal
        <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={240} required className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" placeholder="For example, approve the next contribution amount" />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">Details <span className="font-normal text-slate-500">(optional)</span>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} placeholder="Add context members need before voting." />
      </label>
      <label className="grid max-w-sm gap-1 text-sm font-medium text-slate-700">Close voting at <span className="font-normal text-slate-500">(optional)</span>
        <input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" />
      </label>
      <div><FormSubmit pending={pending}>Create decision and open voting</FormSubmit></div>
    </form>}

    {loading ? <p role="status" className="py-4 text-sm text-slate-500">Loading meeting decisions…</p> : decisions.length ? <div className="space-y-3">
      {decisions.map((decision) => {
        const showResults = canManage || !decision.voting_open
        const votingDeadlinePassed = Boolean(decision.voting_closes_at && Date.parse(decision.voting_closes_at) <= Date.now())
        return <article key={decision.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">{decision.title}</h3>
              {decision.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{decision.description}</p>}
              <p className="mt-2 text-xs text-slate-500">Created {formatDate(decision.created_at)}{decision.voting_closes_at ? ` · Voting closes ${formatDate(decision.voting_closes_at)}` : ''}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${decision.voting_open ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
              {decision.voting_open ? 'Voting open' : decision.outcome ? decision.outcome[0].toUpperCase() + decision.outcome.slice(1) : 'Voting closed'}
            </span>
          </div>

          {decision.voting_open && canVote && <div className="mt-4 flex flex-wrap items-center gap-2">
            {decision.my_vote ? <p className="text-sm text-slate-700">Your vote: <strong>{voteLabels[decision.my_vote]}</strong></p> : votingDeadlinePassed ? <p className="text-sm text-amber-800">The voting period has ended; an authorized officer must close and tally this ballot.</p> : <>
              <span className="mr-1 text-sm text-slate-600">Cast your vote:</span>
              {(['yes', 'no', 'abstain'] as const).map((vote) => <button key={vote} type="button" disabled={pending} onClick={() => void submitAction({ action: 'vote', decision_id: decision.id, vote })} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{voteLabels[vote]}</button>)}
            </>}
          </div>}

          {showResults && <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
            <span>Yes <strong className="text-slate-900">{decision.yes_count}</strong></span>
            <span>No <strong className="text-slate-900">{decision.no_count}</strong></span>
            <span>Abstain <strong className="text-slate-900">{decision.abstain_count}</strong></span>
            {decision.outcome && <span className="font-semibold text-indigo-800">Outcome: {decision.outcome}</span>}
          </div>}

          {canManage && decision.voting_open && <button type="button" disabled={pending} onClick={() => {
            if (window.confirm('Close voting and record the outcome from the votes cast?')) void submitAction({ action: 'finalize', decision_id: decision.id })
          }} className="mt-4 rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50">Close voting and tally</button>}
        </article>
      })}
    </div> : <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">No decisions have been recorded for this meeting.</p>}
  </section>
}
