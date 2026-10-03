import { DashboardModule } from '@/features/dashboard/components/DashboardModule'
export default async function LoanDetailPage({ params }: { params: Promise<{ loanId: string }> }) { const { loanId } = await params; return <DashboardModule resource="loans" itemId={loanId} /> }
