import type { TextareaHTMLAttributes } from 'react'

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-28 w-full resize-y rounded-xl border border-indigo-100 bg-white/90 px-3.5 py-2.5 text-sm font-medium text-[#081233] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-indigo-200 focus:border-[#7B3FF2]/50 focus:bg-white focus:ring-4 focus:ring-[#7B3FF2]/10 ${className}`}
      {...props}
    />
  )
}
