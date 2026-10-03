export type FinancialReportRow = {
  period: string
  contributions: number
  social_contributions: number
  repayments: number
  interest_collected: number
  loans_issued: number
  expenses: number
  social_expenses: number
  social_disbursements: number
  social_fund_closing_balance: number
  net_share_activity: number
  closing_balance: number
}
export type MemberReportRow = { member_id: string; full_name: string; contributions_total: number; loans_outstanding: number; attendance_rate: number }
