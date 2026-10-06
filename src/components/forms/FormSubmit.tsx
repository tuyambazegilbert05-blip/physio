import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function FormSubmit({
  children,
  pending = false,
  disabled = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      {...props}
      className={`rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgba(123,63,242,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-12px_rgba(123,63,242,0.8)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B3FF2] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${className}`}
    >
      {pending ? 'Please wait…' : children}
    </button>
  )
}
