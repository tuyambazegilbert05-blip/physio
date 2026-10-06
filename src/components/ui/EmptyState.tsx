import { FileSearch2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="grid min-h-56 place-items-center rounded-[26px] border border-dashed border-indigo-200 bg-white/70 px-6 py-12 text-center shadow-[0_18px_48px_-40px_rgba(36,55,245,0.5)]">
      <div className="max-w-md">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-100 text-[#5A36E8] ring-1 ring-indigo-100/80">
          <FileSearch2 className="h-5 w-5" />
        </span>
        <h2 className="font-heading text-base font-extrabold tracking-tight text-[#081233]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}
