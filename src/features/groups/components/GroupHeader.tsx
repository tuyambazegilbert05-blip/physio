import type { ReactNode } from 'react'
export function GroupHeader({ name, cycle, children }: { name: string; cycle: string; children?: ReactNode }) {
  return <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-slate-500">Current group · {cycle}</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{name}</h1></div>{children}</header>
}
