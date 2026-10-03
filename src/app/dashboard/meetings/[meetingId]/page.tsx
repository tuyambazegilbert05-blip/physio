import { DashboardModule } from '@/features/dashboard/components/DashboardModule'
export default async function MeetingDetailPage({ params }: { params: Promise<{ meetingId: string }> }) { const { meetingId } = await params; return <DashboardModule resource="meetings" itemId={meetingId} /> }
