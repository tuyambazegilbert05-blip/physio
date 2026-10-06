import styles from './BrandLoader.module.css'
import { cn } from '@/lib/utils'
import Image from 'next/image'

type BrandLoaderProps = {
  label?: string
  message?: string
  variant?: 'screen' | 'inline'
}

export function BrandLoader({
  label = 'Loading Physio Fund Cycle',
  message = 'Preparing your workspace',
  variant = 'screen',
}: BrandLoaderProps) {
  const className = variant === 'screen' ? styles.screen : styles.inline
  const size = variant === 'screen' ? 180 : 32

  return (
    <div className={className} role="status" aria-label={label} aria-live="polite">
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.halo} />
        <span
          style={{ width: `${size}px`, height: `${size}px` }}
          className="relative inline-flex items-center justify-center overflow-hidden"
        >
          <span className={cn('inline-flex items-center gap-2', className)}>
             <Image
                    src="/animated_log/logo_assemble_transparent.gif"
                    alt=""
                    width={size}
                    height={size}
                    unoptimized
                    loading="lazy"
                    style={{ width: `${size}px`, height: `${size}px` }}
                    className="shrink-0 object-contain select-none"
                  />
          </span>
        </span>
      </span>
      {variant === 'screen' && (
        <span className={`${styles.wordmark} font-heading font-extrabold text-[#081233]`}>
          Physio Fund Cycle
        </span>
      )}
      {message && <span className={styles.message}>{message}</span>}
    </div>
  )
}
