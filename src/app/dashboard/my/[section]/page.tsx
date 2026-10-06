import { notFound } from 'next/navigation'
import { MemberWorkspace, type MemberArea } from '@/features/members/components/MemberWorkspace'
import { createClient } from '@/lib/supabase/server'
import { getCurrentApplicationUser } from '@/lib/security/application-session'
import { getIncompleteOnboardingGroup } from '@/lib/membership/onboarding-destination'
import { redirect } from 'next/navigation'

const memberAreas = new Set<MemberArea>([
  'savings',
  'contributions',
  'loans',
  'statements',
  'communications',
])

export default async function PersonalMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<{ group?: string }>
}) {
  const [{ section }, { group: requestedGroup }, supabase, user] = await Promise.all([
    params,
    searchParams,
    createClient(),
    getCurrentApplicationUser(),
  ])
  if (!memberAreas.has(section as MemberArea)) notFound()

  const { data: memberships, error: membershipError } = await supabase
    .from('members')
    .select('group_id')
    .eq('user_id', user?.id ?? '')
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
  if (membershipError) throw membershipError

  const memberGroupIds = [...new Set((memberships ?? []).map((item) => item.group_id))]
  const { data: memberGroups, error: groupsError } = memberGroupIds.length
    ? await supabase.from('groups').select('id,name').in('id', memberGroupIds).order('name')
    : { data: [], error: null }
  if (groupsError) throw groupsError

  const preferredGroupId = memberGroupIds.includes(requestedGroup ?? '')
    ? requestedGroup
    : memberGroupIds[0]

  if (user && preferredGroupId) {
    const onboardingGroup = await getIncompleteOnboardingGroup(user.id, requestedGroup)
    if (onboardingGroup) redirect(`/dashboard/onboarding?group=${encodeURIComponent(onboardingGroup)}`)
  }

  return (
    <MemberWorkspace
      section={section as MemberArea}
      preferredGroupId={preferredGroupId}
      groups={memberGroups ?? []}
    />
  )
}
