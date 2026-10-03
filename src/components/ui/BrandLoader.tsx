import Image from 'next/image'
import styles from './BrandLoader.module.css'

type BrandLoaderProps = {
  label?: string
  message?: string
  variant?: 'screen' | 'inline'
}

export function BrandLoader({
  label = 'Loading Phyaio Cycle',
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
          <Image
            src="/animated_log/logo_assemble_transparent.gif"
            alt="Phyaio Cycle"
            width={size}
            height={size}
            unoptimized
            priority
            loading="eager"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              maxWidth: `${size}px`,
              maxHeight: `${size}px`,
              objectFit: 'contain',
            }}
            className="block select-none"
          />
        </span>
      </span>
      {variant === 'screen' && (
        <span className={`${styles.wordmark} font-heading font-extrabold text-[#081233]`}>
          Phyaio Cycle
        </span>
      )}
      {message && <span className={styles.message}>{message}</span>}
    </div>
  )
}
