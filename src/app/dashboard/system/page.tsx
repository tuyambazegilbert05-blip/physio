import { SystemControlCenter } from '@/features/system/components/SystemControlCenter'

export default async function SystemPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams
  return <SystemControlCenter preferredGroupId={group} />
}
