import type { ReactNode } from 'react'

export function FormField({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode }) {
  return <div className="grid gap-1.5"><label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">{label}</label>{children}{hint && <p id={`${htmlFor}-hint`} className="text-xs text-slate-500">{hint}</p>}{error && <p id={`${htmlFor}-error`} role="alert" className="text-xs text-red-700">{error}</p>}</div>
}
