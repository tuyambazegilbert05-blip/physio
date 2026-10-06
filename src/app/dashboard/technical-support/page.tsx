import { TechnicalSupportWorkspace } from '@/features/system/components/TechnicalSupportWorkspace'

export default async function TechnicalSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const { group } = await searchParams
  return <TechnicalSupportWorkspace preferredGroupId={group} />
}
