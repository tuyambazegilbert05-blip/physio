'use client'

import { useEffect, useState } from 'react'
import { Lottie } from 'lottie-react'

export type LottieVariant = 'loading' | 'savings' | 'success'

type AuthLottieProps = {
  variant: LottieVariant
  loop?: boolean
  autoplay?: boolean
  className?: string
  size?: number
}

export function AuthLottie({
  variant,
  loop = true,
  autoplay = true,
  className = '',
  size = 64,
}: AuthLottieProps) {
  const [mounted, setMounted] = useState(false)
  const [animData, setAnimData] = useState<object | null>(null)
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function fetchAnimation() {
      try {
        let jsonPath = '/animations/piggy_bank_saving.json'
        if (variant === 'loading') {
          jsonPath = '/animations/loading_financial.json'
        } else if (variant === 'success') {
          jsonPath = '/animations/piggy_bank_saving.json'
        }

        const res = await fetch(jsonPath)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!isCancelled) {
          setAnimData(data)
        }
      } catch (err) {
        console.warn(`[AuthLottie] Could not load animation: ${variant}`, err)
      }
    }

    fetchAnimation()

    return () => {
      isCancelled = true
    }
  }, [variant])

  if (!mounted || !animData) {
    return <div style={{ width: size, height: size }} className={className} />
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}
    >
      <Lottie
        {...({
          src: animData,
          loop: loop && !prefersReduced,
          autoplay: autoplay && !prefersReduced,
          className: 'w-full h-full',
        } as any)}
      />
    </div>
  )
}
