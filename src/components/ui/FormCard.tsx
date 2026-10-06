import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FormCardProps = HTMLAttributes<HTMLElement> & {
  title?: string
  description?: string
  headerAction?: ReactNode
  children: ReactNode
}

export function FormCard({
  title,
  description,
  headerAction,
  className,
  children,
  ...props
}: FormCardProps) {
  const hasHeader = Boolean(title || description || headerAction)

  return (
    <section
      className={cn(
        'relative rounded-[28px] border border-slate-100/70 bg-white shadow-[0_24px_64px_-12px_rgba(36,55,245,0.12),0_0_0_1px_rgba(36,55,245,0.04)]',
        hasHeader ? 'p-5 sm:p-7' : 'p-8 sm:p-10',
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-heading text-xl font-extrabold tracking-tight text-[#081233] sm:text-2xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
            )}
          </div>
          {headerAction}
        </header>
      )}
      {children}
    </section>
  )
}
