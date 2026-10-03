import { FinancialChart } from './FinancialChart'

export function SavingsChart({ values }: { values: { month: string; balance: number }[] }) {
  return <FinancialChart label="Savings balance" values={values.map(({ month, balance }) => ({ label: month, value: balance }))} />
}
