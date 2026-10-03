'use client'

import { useCallback, useEffect, useState } from 'react'
import { FormError } from '@/components/forms/FormError'
import { apiRequest } from '@/lib/api'

type MeetingMember = { id: string; full_name: string; status: 'active' | 'inactive' | 'suspended' }
type AttendanceRow = { id: string; meeting_id: string; member_id: string; present: boolean; recorded_by: string; recorded_at: string }
type AttendanceData = { members: MeetingMember[]; attendance: AttendanceRow[] }

export function MeetingAttendancePanel({ meetingId, canManage }: { meetingId: string; canManage: boolean }) {
  const [data, setData] = useState<AttendanceData>({ members: [], attendance: [] })
  const [loading, setLoading] = useState(true)
  const [pendingMember, setPendingMember] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const next = await apiRequest<AttendanceData>(`/api/meetings/${meetingId}/attendance`)
    setData(next)
  }, [meetingId])

  useEffect(() => {
    let active = true
    setLoading(true)
    apiRequest<AttendanceData>(`/api/meetings/${meetingId}/attendance`)
      .then((result) => { if (active) setData(result) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load attendance.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [meetingId])

  async function setAttendance(memberId: string, present: boolean) {
    setPendingMember(memberId)
    setError('')
    try {
      await apiRequest(`/api/meetings/${meetingId}/attendance`, { method: 'POST', body: JSON.stringify({ member_id: memberId, present }) })
      try {
        await refresh()
      } catch {
        setError('Attendance was saved, but the roster could not be refreshed.')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not record attendance.')
    } finally {
      setPendingMember('')
    }
  }

  const records = new Map(data.attendance.map((record) => [record.member_id, record]))
  const presentCount = data.attendance.filter((record) => record.present).length

  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="font-semibold text-slate-900">Attendance</h2>
        <p className="mt-1 text-sm text-slate-600">{presentCount} present · {data.attendance.length} marked · {data.members.length} members</p>
      </div>
    </div>
    <FormError message={error} />
    {loading ? <p role="status" className="py-4 text-sm text-slate-500">Loading attendance…</p> : <div className="mt-3 max-h-80 divide-y divide-slate-100 overflow-auto">
      {data.members.map((member) => {
        const record = records.get(member.id)
        return <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-800">{member.full_name}</p>
            <p className="text-xs capitalize text-slate-500">{record ? (record.present ? 'Present' : 'Absent') : 'Not recorded'}{member.status !== 'active' ? ` · ${member.status} member` : ''}</p>
          </div>
          {canManage && <div className="flex gap-2">
            <button type="button" aria-pressed={record?.present === true} disabled={pendingMember === member.id || Boolean(record?.present)} onClick={() => void setAttendance(member.id, true)} className={`rounded border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${record?.present ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Present</button>
            <button type="button" aria-pressed={record?.present === false} disabled={pendingMember === member.id || record?.present === false} onClick={() => void setAttendance(member.id, false)} className={`rounded border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${record?.present === false ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Absent</button>
          </div>}
        </div>
      })}
      {!data.members.length && <p className="py-4 text-sm text-slate-500">No group members were found.</p>}
    </div>}
  </section>
}
