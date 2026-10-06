'use client'

import { Canvas } from '@react-three/fiber'
import { useSyncExternalStore, type ReactNode } from 'react'
import { useMobile } from '@/hooks/useMobile'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
let webgl2Available: boolean | undefined

function subscribeToCanvasPreference(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery)
  mediaQuery.addEventListener('change', onChange)
  window.addEventListener('resize', onChange)
  return () => {
    mediaQuery.removeEventListener('change', onChange)
    window.removeEventListener('resize', onChange)
  }
}

function getCanvasPreference() {
  if (window.innerWidth <= 700 || window.matchMedia(reducedMotionQuery).matches) return false
  if (webgl2Available === undefined) {
    webgl2Available = Boolean(document.createElement('canvas').getContext('webgl2'))
  }
  return webgl2Available
}

export function ThreeCanvas({ children, fallback, label = 'Decorative 3D community illustration' }: { children: ReactNode; fallback: ReactNode; label?: string }) {
  const webgl = useSyncExternalStore(subscribeToCanvasPreference, getCanvasPreference, () => false)
  const mobile = useMobile()
  if (!webgl || mobile) return <div role="img" aria-label={label}>{fallback}</div>
  return <div aria-hidden="true" className="h-full min-h-64 w-full"><Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [0, 0, 8], fov: 45 }}>{children}</Canvas></div>
}
