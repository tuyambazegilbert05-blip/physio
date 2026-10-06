import { databaseError, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

/**
 * Returns the signed-in user's own group position. Every financial query is
 * filtered by the member id loaded from auth.uid(), even when the account also
 * has group-wide permissions through another role.
 */
export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response

  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) {
    return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  }

  const [memberResult, groupResult, rolesResult, profileResult, cycleResult, controlsResult] = await Promise.all([
    auth.supabase
      .from('members')
      .select('id,group_id,user_id,full_name,email,phone,status,joined_at,created_at,updated_at')
      .eq('group_id', groupId!)
      .eq('user_id', auth.user!.id)
      .eq('status', 'active')
      .maybeSingle(),
    auth.supabase
      .from('groups')
      .select('id,name,currency,contribution_amount,contribution_frequency')
      .eq('id', groupId!)
      .maybeSingle(),
    auth.supabase.rpc('current_group_roles', { target_group: groupId! }),
    auth.supabase.from('profiles').select('full_name').eq('id', auth.user!.id).maybeSingle(),
    auth.supabase
      .from('group_cycles')
      .select(
        'id,name,starts_on,ends_on,share_price,contribution_amount,contribution_due_day,rules,status',
      )
      .eq('group_id', groupId!)
      .eq('status', 'open')
      .maybeSingle(),
    auth.supabase.from('group_system_controls')
      .select('status,message,disabled_modules')
      .eq('group_id', groupId!)
      .maybeSingle(),
  ])

  for (const result of [memberResult, groupResult, rolesResult, profileResult, cycleResult, controlsResult]) {
    if (result.error) return databaseError(result.error)
  }
  if (!memberResult.data || !groupResult.data) {
    return Response.json(
      { error: { message: 'No membership was found for this group.' } },
      { status: 403 },
    )
  }

  const { data: onboardingComplete, error: onboardingError } = await auth.supabase.rpc(
    'member_onboarding_is_complete',
    { target_group: groupId! },
  )
  if (onboardingError) return databaseError(onboardingError)
  if (!onboardingComplete) {
    return Response.json({
      error: {
        message: 'Complete this group’s onboarding before opening your personal financial records.',
        code: 'ONBOARDING_REQUIRED',
        group_id: groupId,
        onboarding_url: `/dashboard/onboarding?group=${encodeURIComponent(groupId!)}`,
      },
    }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }

  const memberId = memberResult.data.id
  const [contributions, obligations, shares, loans, socialRequests, notifications, announcements] =
    await Promise.all([
      auth.supabase
        .from('contributions')
        .select(
          'id,obligation_id,amount,contribution_type,period,status,reference,received_at,created_at',
        )
        .eq('group_id', groupId!)
        .eq('member_id', memberId)
        .order('period', { ascending: false })
        .limit(500),
      auth.supabase
        .from('contribution_obligations')
        .select('id,period,due_on,amount_due,penalty_amount,status')
        .eq('group_id', groupId!)
        .eq('member_id', memberId)
        .order('period', { ascending: false })
        .limit(100),
      auth.supabase
        .from('share_transactions')
        .select('id,direction,units,unit_price,amount,status,reference,created_at')
        .eq('group_id', groupId!)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(300),
      auth.supabase
        .from('loans')
        .select(
          'id,principal,outstanding_amount,outstanding_interest,interest_rate,term_months,purpose,status,due_date,disbursed_at,created_at',
        )
        .eq('group_id', groupId!)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(100),
      auth.supabase
        .from('social_fund_requests')
        .select(
          'id,amount_requested,reason,status,decision_note,disbursement_reference,created_at,decided_at,disbursed_at',
        )
        .eq('group_id', groupId!)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(100),
      auth.supabase
        .from('notifications')
        .select('id,title,body,href,read_at,created_at')
        .eq('user_id', auth.user!.id)
        .order('created_at', { ascending: false })
        .limit(8),
      auth.supabase
        .from('group_announcements')
        .select('id,title,body,published_at')
        .eq('group_id', groupId!)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(5),
    ])

  const initialResults = [
    contributions,
    obligations,
    shares,
    loans,
    socialRequests,
    notifications,
    announcements,
  ]
  const failed = initialResults.find((result) => result.error)
  if (failed?.error) return databaseError(failed.error)

  const loanIds = (loans.data ?? []).map((loan) => loan.id)
  const [repaymentsResult, interestChargesResult] = loanIds.length
    ? await Promise.all([
        auth.supabase
          .from('loan_repayments')
          .select(
            'id,loan_id,amount,principal_amount,interest_amount,status,received_at,reference,payment_method',
          )
          .in('loan_id', loanIds)
          .order('received_at', { ascending: false })
          .limit(300),
        auth.supabase
          .from('loan_interest_charges')
          .select('id,loan_id,period,due_on,principal_basis,rate,amount')
          .in('loan_id', loanIds)
          .order('due_on', { ascending: false })
          .limit(300),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ]
  for (const result of [repaymentsResult, interestChargesResult]) {
    if (result.error) return databaseError(result.error)
  }

  return Response.json({
    data: {
      group: groupResult.data,
      member: memberResult.data,
      profileName: profileResult.data?.full_name ?? auth.user!.email ?? memberResult.data.full_name,
      roles: rolesResult.data ?? [],
      cycle: cycleResult.data,
      systemControls: controlsResult.data ?? { status: 'normal', message: null, disabled_modules: [] },
      contributions: contributions.data ?? [],
      obligations: obligations.data ?? [],
      shares: shares.data ?? [],
      loans: loans.data ?? [],
      repayments: repaymentsResult.data ?? [],
      interestCharges: interestChargesResult.data ?? [],
      socialRequests: socialRequests.data ?? [],
      notifications: notifications.data ?? [],
      announcements: announcements.data ?? [],
    },
  })
}
