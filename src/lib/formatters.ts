export function formatMoney(amount: number | string | bigint, currency = 'RWF', locale = 'en-RW') {
  const numeric = typeof amount === 'string' ? Number(amount) : amount
  if (typeof numeric === 'number' && !Number.isFinite(numeric)) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(numeric)
}

export function formatDate(value: string | Date, locale = 'en-RW') {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

export function formatPercent(value: number, fractionDigits = 1) {
  return Number.isFinite(value) ? `${value.toFixed(fractionDigits)}%` : '—'
}
