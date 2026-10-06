import type { ReactNode } from 'react'

export function Alert({
  title,
  children,
  tone = 'info',
}: {
  title: string
  children: ReactNode
  tone?: 'info' | 'success' | 'warning' | 'error'
}) {
  const colors = {
    info: 'border-indigo-100 bg-indigo-50/80 text-indigo-950',
    success: 'border-emerald-200 bg-emerald-50/85 text-emerald-950',
    warning: 'border-amber-200 bg-amber-50/85 text-amber-950',
    error: 'border-rose-200 bg-rose-50/85 text-rose-950',
  }
  return (
    <section
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-[20px] border p-4 shadow-[0_12px_32px_-28px_rgba(36,55,245,0.35)] ${colors[tone]}`}
    >
      <h2 className="font-heading text-sm font-bold">{title}</h2>
      <div className="mt-1 text-sm leading-relaxed">{children}</div>
    </section>
  )
}
