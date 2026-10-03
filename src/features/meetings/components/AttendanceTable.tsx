import { DataTable } from '@/components/tables/DataTable'
import type { Attendance } from '@/types/meeting'
export function AttendanceTable({ attendance }: { attendance: (Attendance & { member_name: string })[] }) {
  return <DataTable rows={attendance} rowKey="id" columns={[{ key: 'member_name', label: 'Member' }, { key: 'present', label: 'Attendance', render: (row) => row.present ? 'Present' : 'Absent' }, { key: 'recorded_at', label: 'Recorded' }]} />
}
