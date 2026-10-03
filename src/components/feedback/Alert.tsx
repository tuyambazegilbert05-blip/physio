import type { ReactNode } from 'react'

export function Alert({ title, children, tone = 'info' }: { title: string; children: ReactNode; tone?: 'info' | 'success' | 'warning' | 'error' }) {
  const colors = { info: 'border-blue-200 bg-blue-50 text-blue-950', success: 'border-emerald-200 bg-emerald-50 text-emerald-950', warning: 'border-amber-200 bg-amber-50 text-amber-950', error: 'border-red-200 bg-red-50 text-red-950' }
  return <section role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-4 ${colors[tone]}`}><h2 className="font-semibold">{title}</h2><div className="mt-1 text-sm">{children}</div></section>
}
