import type { ReactNode } from 'react'

export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return <details className="relative inline-block"><summary className="cursor-pointer list-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">{label}</summary><div className="absolute right-0 z-20 mt-2 min-w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">{children}</div></details>
}
