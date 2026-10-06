export const groupSystemModules = [
  { key: 'member_registration', label: 'Membership requests and invitations' },
  { key: 'technical_access', label: 'Technical role assignments' },
  { key: 'contributions', label: 'Contributions and payments' },
  { key: 'shares', label: 'Share records' },
  { key: 'loan_requests', label: 'Loan requests' },
  { key: 'loan_approvals', label: 'Loan approvals and disbursement' },
  { key: 'loan_repayments', label: 'Loan repayments' },
  { key: 'social_fund', label: 'Social fund' },
  { key: 'profit_distribution', label: 'Profit distribution' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'reconciliation', label: 'Bank reconciliation' },
  { key: 'savings_cycles', label: 'Savings cycle configuration' },
  { key: 'meetings', label: 'Meetings and decisions' },
  { key: 'announcements', label: 'Official announcements' },
  { key: 'chat', label: 'Group communications' },
] as const

export type GroupSystemModule = (typeof groupSystemModules)[number]['key']
