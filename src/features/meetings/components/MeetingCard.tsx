import type { Meeting } from '@/types/meeting'
import { formatDate } from '@/lib/formatters'
export function MeetingCard({ meeting }: { meeting: Meeting }) {
  return <article className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="font-semibold">{meeting.title}</h3><p className="mt-1 text-sm text-slate-600">{formatDate(meeting.starts_at)}{meeting.location ? ` · ${meeting.location}` : ''}</p>{meeting.agenda && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{meeting.agenda}</p>}</article>
}
