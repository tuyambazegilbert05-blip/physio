import type { InputHTMLAttributes } from 'react'

export function Radio({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="radio" className={`size-4 accent-indigo-600 ${className}`} {...props} />
}
