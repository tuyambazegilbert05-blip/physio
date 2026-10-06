'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { FormCard } from '@/components/ui/FormCard'

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#081233]/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <FormCard
        role="dialog"
        aria-modal="true"
        aria-label={title}
        title={title}
        className="my-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto p-5 sm:p-7"
        headerAction={
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-2 -mt-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-indigo-50 hover:text-[#5A36E8] focus-visible:outline-2 focus-visible:outline-[#7B3FF2]"
          >
            <X className="h-4 w-4" />
          </button>
        }
      >
        {children}
      </FormCard>
    </div>
  )
}
