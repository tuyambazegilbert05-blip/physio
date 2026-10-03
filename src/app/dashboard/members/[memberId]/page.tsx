import { DashboardModule } from '@/features/dashboard/components/DashboardModule'
export default async function MemberDetailPage({ params }: { params: Promise<{ memberId: string }> }) { const { memberId } = await params; return <DashboardModule resource="members" itemId={memberId} /> }
