import { DashboardHome } from '@/features/dashboard/components/DashboardHome'

export default async function GroupWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const { group } = await searchParams
  return <DashboardHome groupId={group} view="workspace" />
}
