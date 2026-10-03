'use client'

import { Canvas } from '@react-three/fiber'
import { useEffect, useState, type ReactNode } from 'react'
import { useMobile } from '@/hooks/useMobile'

export function ThreeCanvas({ children, fallback, label = 'Decorative 3D community illustration' }: { children: ReactNode; fallback: ReactNode; label?: string }) {
  const [webgl, setWebgl] = useState(false)
  const mobile = useMobile()
  useEffect(() => {
    const context = document.createElement('canvas').getContext('webgl2')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setWebgl(Boolean(context) && !reduced && window.innerWidth > 700)
  }, [])
  if (!webgl || mobile) return <div role="img" aria-label={label}>{fallback}</div>
  return <div aria-hidden="true" className="h-full min-h-64 w-full"><Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [0, 0, 8], fov: 45 }}>{children}</Canvas></div>
}
