import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><div><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>{action && <div className="mt-4">{action}</div>}</div></div>
}
