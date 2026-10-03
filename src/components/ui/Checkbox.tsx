import type { InputHTMLAttributes } from 'react'

export function Checkbox({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={`size-4 accent-indigo-600 ${className}`} {...props} />
}
