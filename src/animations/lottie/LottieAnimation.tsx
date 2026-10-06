'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentType, Ref } from 'react'
import { Lottie, type LottieHandle } from 'lottie-react'
import { loadAnimation, type LottieAsset } from './index'

type AnimationPlayerProps = {
  lottieRef: Ref<LottieHandle>
  src: object
  autoplay: boolean
  loop: boolean
  className?: string
}

const AnimationPlayer = Lottie as ComponentType<AnimationPlayerProps>

export function LottieAnimation({ animation, autoplay = true, loop = false, label, className = '' }: { animation: LottieAsset; autoplay?: boolean; loop?: boolean; label: string; className?: string }) {
  const [data, setData] = useState<unknown>(null)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const player = useRef<LottieHandle>(null)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => { let active = true; loadAnimation(animation).then((module) => { if (active) setData(module.default) }); return () => { active = false } }, [animation])
  useEffect(() => {
    if (!container || !player.current || reducedMotion) return
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting ? player.current?.play() : player.current?.pause())
    observer.observe(container)
    return () => observer.disconnect()
  }, [container, data, reducedMotion])
  if (!data) return <div ref={setContainer} role="img" aria-label={label} className={`min-h-20 ${className}`} />
  return <div ref={setContainer} aria-label={label} role="img" className={className}><AnimationPlayer lottieRef={player} src={data as object} autoplay={autoplay && !reducedMotion} loop={loop && !reducedMotion} /></div>
}
