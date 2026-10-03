import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function FormSubmit({ children, pending = false, disabled = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; pending?: boolean }) {
  return <button type="submit" disabled={pending || disabled} aria-busy={pending} {...props} className={`rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>{pending ? 'Please wait…' : children}</button>
}
