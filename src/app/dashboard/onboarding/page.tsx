import { redirect } from 'next/navigation'
import { MemberOnboarding } from '@/features/membership/components/MemberOnboarding'
import { getCurrentApplicationUser } from '@/lib/security/application-session'
import { getIncompleteOnboardingGroup } from '@/lib/membership/onboarding-destination'

export default async function MemberOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const [{ group: requestedGroup }, user] = await Promise.all([
    searchParams,
    getCurrentApplicationUser(),
  ])
  if (!user) redirect('/login?next=/dashboard/onboarding')
  const groupId = await getIncompleteOnboardingGroup(user.id, requestedGroup)
  if (!groupId) redirect(requestedGroup ? `/dashboard?group=${encodeURIComponent(requestedGroup)}` : '/dashboard')
  return <MemberOnboarding groupId={groupId} />
}
