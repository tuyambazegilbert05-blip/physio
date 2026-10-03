import { FinancialChart } from './FinancialChart'

export function LoanChart({ values }: { values: { month: string; outstanding: number }[] }) {
  return <FinancialChart label="Outstanding loans" values={values.map(({ month, outstanding }) => ({ label: month, value: outstanding }))} />
}
