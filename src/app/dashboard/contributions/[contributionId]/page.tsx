import { DashboardModule } from '@/features/dashboard/components/DashboardModule'
export default async function ContributionDetailPage({ params }: { params: Promise<{ contributionId: string }> }) { const { contributionId } = await params; return <DashboardModule resource="contributions" itemId={contributionId} /> }
