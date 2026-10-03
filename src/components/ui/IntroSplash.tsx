'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BrandLoader } from './BrandLoader'

export function IntroSplash() {
  const router = useRouter()

  useEffect(() => {
    // Graceful presentation of brand animation then route to dashboard
    const timer = window.setTimeout(() => {
      router.replace('/dashboard')
    }, 2800)

    return () => window.clearTimeout(timer)
  }, [router])

  return (
    <main
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading Phyaio Cycle"
      className="w-full min-h-screen bg-[#F8FAFF] flex items-center justify-center"
    >
      <BrandLoader
        label="Loading Phyaio Cycle"
        message="Preparing your workspace"
        variant="screen"
      />
    </main>
  )
}
