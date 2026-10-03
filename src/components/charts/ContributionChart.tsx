import { FinancialChart } from './FinancialChart'

export function ContributionChart({ values }: { values: { month: string; collected: number }[] }) {
  return <FinancialChart label="Contributions collected" values={values.map(({ month, collected }) => ({ label: month, value: collected }))} />
}
