import { DashboardHome } from '@/features/dashboard/components/DashboardHome'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams
  return <DashboardHome groupId={group} />
}
