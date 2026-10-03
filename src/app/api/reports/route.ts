import { uuidSchema } from '@/lib/validations'
import { databaseError, requireApiUser } from '@/lib/supabase/route'

export async function GET(request: Request) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const params = new URL(request.url).searchParams
  const groupId = params.get('group_id')
  const type = params.get('type') ?? 'financial'
  if (!uuidSchema.safeParse(groupId).success) return Response.json({ error: { message: 'A valid group_id is required.' } }, { status: 400 })
  if (type !== 'members' && type !== 'financial') return Response.json({ error: { message: 'Report type must be financial or members.' } }, { status: 400 })

  const requiredPermissions = type === 'members' ? ['reports:read', 'financial:read', 'members:read'] : ['reports:read', 'financial:read']
  const permissionResults = await Promise.all(requiredPermissions.map((required_permission) => auth.supabase.rpc('has_group_permission', { target_group: groupId!, required_permission })))
  for (const result of permissionResults) if (result.error) return databaseError(result.error)
  if (permissionResults.some((result) => !result.data)) return Response.json({ error: { message: 'You do not have permission to view this report.' } }, { status: 403 })

  if (type === 'members') {
    const [membersResult, contributionsResult, loansResult, meetingsResult] = await Promise.all([
      auth.supabase.from('members').select('id,full_name').eq('group_id', groupId!).eq('status', 'active'),
      auth.supabase.from('contributions').select('member_id,amount,status,contribution_type').eq('group_id', groupId!).eq('status', 'verified').neq('contribution_type', 'social'),
      auth.supabase.from('loans').select('member_id,outstanding_amount').eq('group_id', groupId!).in('status', ['active', 'defaulted']),
      auth.supabase.from('meetings').select('id,starts_at').eq('group_id', groupId!).lte('starts_at', new Date().toISOString()),
    ])
    for (const result of [membersResult, contributionsResult, loansResult, meetingsResult]) if (result.error) return databaseError(result.error)
    const memberIds = (membersResult.data ?? []).map((member) => member.id)
    const meetingIds = (meetingsResult.data ?? []).map((meeting) => meeting.id)
    const attendanceResult = memberIds.length && meetingIds.length
      ? await auth.supabase.from('attendance').select('member_id,present').in('member_id', memberIds).in('meeting_id', meetingIds)
      : { data: [], error: null }
    if (attendanceResult.error) return databaseError(attendanceResult.error)
    const rows = memberIds.map((memberId) => {
      const member = membersResult.data!.find((item) => item.id === memberId)!
      const contributions = (contributionsResult.data ?? []).filter((item) => item.member_id === memberId).reduce((sum, item) => sum + BigInt(item.amount), 0n)
      const loans = (loansResult.data ?? []).filter((item) => item.member_id === memberId).reduce((sum, item) => sum + BigInt(item.outstanding_amount), 0n)
      const attendance = (attendanceResult.data ?? []).filter((item) => item.member_id === memberId)
      const meetingCount = meetingIds.length
      return { member_id: memberId, full_name: member.full_name, contributions_total: Number(contributions), loans_outstanding: Number(loans), attendance_rate: meetingCount ? Math.round(attendance.filter((item) => item.present).length / meetingCount * 1000) / 10 : 0 }
    })
    return Response.json({ data: rows })
  }

  const [{ data: contributions, error: contributionError }, { data: loans, error: loanError }, { data: expenses, error: expenseError }, { data: shares, error: shareError }, { data: socialRequests, error: socialRequestError }, { data: summary, error: summaryError }] = await Promise.all([
    auth.supabase.from('contributions').select('amount,period,status,contribution_type').eq('group_id', groupId!),
    auth.supabase.from('loans').select('id,principal,disbursed_at,status').eq('group_id', groupId!).in('status', ['active', 'repaid', 'defaulted']),
    auth.supabase.from('expenses').select('amount,spent_on,funding_source').eq('group_id', groupId!).eq('status', 'paid'),
    auth.supabase.from('share_transactions').select('amount,direction,created_at').eq('group_id', groupId!).eq('status', 'verified'),
    auth.supabase.from('social_fund_requests').select('amount_requested,disbursed_at').eq('group_id', groupId!).eq('status', 'disbursed'),
    auth.supabase.from('savings_summary').select('currency,reserve_balance').eq('group_id', groupId!).single(),
  ])
  if (contributionError) return databaseError(contributionError)
  if (loanError) return databaseError(loanError)
  if (expenseError) return databaseError(expenseError)
  if (shareError) return databaseError(shareError)
  if (socialRequestError) return databaseError(socialRequestError)
  if (summaryError) return databaseError(summaryError)
  const loanIds = (loans ?? []).map((loan) => loan.id)
  const repaymentResult = loanIds.length
    ? await auth.supabase.from('loan_repayments').select('loan_id,amount,principal_amount,interest_amount,received_at,status').in('loan_id', loanIds).eq('status', 'verified')
    : { data: [], error: null }
  const { data: repayments, error: repaymentError } = repaymentResult
  if (repaymentError) return databaseError(repaymentError)
  const periods: string[] = []
  const now = new Date()
  for (let offset = 11; offset >= 0; offset--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    periods.push(date.toISOString().slice(0, 7))
  }
  const firstPeriod = periods[0]!
  const isBeforeWindow = (value: string | null) => Boolean(value && value.slice(0, 7) < firstPeriod)
  const regularContributions = (contributions ?? []).filter((item) => item.status === 'verified' && item.contribution_type !== 'social')
  const socialContributions = (contributions ?? []).filter((item) => item.status === 'verified' && item.contribution_type === 'social')
  const groupExpenses = (expenses ?? []).filter((expense) => expense.funding_source !== 'social_fund')
  const socialExpenses = (expenses ?? []).filter((expense) => expense.funding_source === 'social_fund')
  const socialDisbursements = socialRequests ?? []
  let running = regularContributions.filter((item) => isBeforeWindow(item.period)).reduce((sum, item) => sum + BigInt(item.amount), 0n)
  running += (repayments ?? []).filter((item) => isBeforeWindow(item.received_at)).reduce((sum, item) => sum + BigInt(item.amount), 0n)
  running -= (loans ?? []).filter((loan) => isBeforeWindow(loan.disbursed_at)).reduce((sum, loan) => sum + BigInt(loan.principal), 0n)
  running -= groupExpenses.filter((expense) => isBeforeWindow(expense.spent_on)).reduce((sum, expense) => sum + BigInt(expense.amount), 0n)
  running += (shares ?? []).filter((share) => isBeforeWindow(share.created_at)).reduce((sum, share) => sum + (share.direction === 'purchase' ? BigInt(share.amount) : -BigInt(share.amount)), 0n)
  running -= BigInt(summary!.reserve_balance)
  let socialRunning = socialContributions.filter((item) => isBeforeWindow(item.period)).reduce((sum, item) => sum + BigInt(item.amount), 0n)
  socialRunning -= socialExpenses.filter((expense) => isBeforeWindow(expense.spent_on)).reduce((sum, expense) => sum + BigInt(expense.amount), 0n)
  socialRunning -= socialDisbursements.filter((item) => isBeforeWindow(item.disbursed_at)).reduce((sum, item) => sum + BigInt(item.amount_requested), 0n)
  const rows = periods.map((period) => {
    const collected = regularContributions.filter((item) => item.period.startsWith(period)).reduce((sum, item) => sum + BigInt(item.amount), 0n)
    const monthlySocialContributions = socialContributions.filter((item) => item.period.startsWith(period)).reduce((sum, item) => sum + BigInt(item.amount), 0n)
    const monthlyRepayments = (repayments ?? []).filter((item) => item.received_at.startsWith(period))
    const repaid = monthlyRepayments.reduce((sum, item) => sum + BigInt(item.amount), 0n)
    const interestCollected = monthlyRepayments.reduce((sum, item) => sum + BigInt(item.interest_amount), 0n)
    const issued = (loans ?? []).filter((loan) => loan.disbursed_at?.startsWith(period)).reduce((sum, loan) => sum + BigInt(loan.principal), 0n)
    const monthlyExpenses = groupExpenses.filter((expense) => expense.spent_on.startsWith(period)).reduce((sum, expense) => sum + BigInt(expense.amount), 0n)
    const monthlySocialExpenses = socialExpenses.filter((expense) => expense.spent_on.startsWith(period)).reduce((sum, expense) => sum + BigInt(expense.amount), 0n)
    const monthlySocialDisbursements = socialDisbursements.filter((item) => item.disbursed_at?.startsWith(period)).reduce((sum, item) => sum + BigInt(item.amount_requested), 0n)
    const netShareActivity = (shares ?? []).filter((share) => share.created_at.startsWith(period)).reduce((sum, share) => sum + (share.direction === 'purchase' ? BigInt(share.amount) : -BigInt(share.amount)), 0n)
    running += collected + repaid - issued - monthlyExpenses + netShareActivity
    socialRunning += monthlySocialContributions - monthlySocialExpenses - monthlySocialDisbursements
    return { period, contributions: Number(collected), social_contributions: Number(monthlySocialContributions), repayments: Number(repaid), interest_collected: Number(interestCollected), loans_issued: Number(issued), expenses: Number(monthlyExpenses), social_expenses: Number(monthlySocialExpenses), social_disbursements: Number(monthlySocialDisbursements), social_fund_closing_balance: Number(socialRunning), net_share_activity: Number(netShareActivity), closing_balance: Number(running), currency: summary!.currency }
  })
  return Response.json({ data: rows })
}
