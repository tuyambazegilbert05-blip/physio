import { DataTable } from '@/components/tables/DataTable'
import type { Meeting } from '@/types/meeting'
import { formatDate } from '@/lib/formatters'
export function MeetingTable({ meetings }: { meetings: Meeting[] }) {
  return <DataTable rows={meetings} rowKey="id" columns={[{ key: 'title', label: 'Meeting' }, { key: 'starts_at', label: 'Starts', render: (meeting) => formatDate(meeting.starts_at) }, { key: 'location', label: 'Location' }, { key: 'agenda', label: 'Agenda' }]} />
}
