import { MemberOnboardingSettingsPage } from '@/features/groups/components/MemberOnboardingSettingsPage'

export default async function MemberOnboardingSettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const { group } = await searchParams
  return <MemberOnboardingSettingsPage preferredGroupId={group} />
}
