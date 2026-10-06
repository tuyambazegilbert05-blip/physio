import Image from 'next/image'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  size?: number
  className?: string
  wordmarkClassName?: string
  showWordmark?: boolean
}

export function BrandLogo({
  size = 30,
  className = '',
  wordmarkClassName = '',
  showWordmark = true,
}: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image
        src="/animated_log/logo_assemble_transparent.gif"
        alt=""
        width={size}
        height={size}
        unoptimized
        loading="eager"
        style={{ width: `${size}px`, height: `${size}px` }}
        className="shrink-0 object-contain select-none"
      />
      {showWordmark && (
        <span className={cn('font-bold lowercase tracking-tight text-[#081233]', wordmarkClassName)}>
          Physio Fund Cycle
        </span>
      )}
    </span>
  )
}
