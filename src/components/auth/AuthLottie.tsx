'use client'

import { useSyncExternalStore } from 'react'
import { useRef, useState } from 'react'
import type { ComponentType, Ref } from 'react'
import { BadgeCheck, CircleDollarSign, LoaderCircle, Pause, Play } from 'lucide-react'
import { Lottie, type LottieHandle, type LottieSubscriptions } from 'lottie-react'
import loadingAnimation from '@/assets/lottie/loading.json'
import savingsAnimation from '@/assets/lottie/savings.json'
import successAnimation from '@/assets/lottie/success.json'
import { useMounted } from '@/hooks/useMounted'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches
}

type LottiePlayerProps = {
  src: object
  loop: boolean
  autoplay: boolean
  lottieRef: Ref<LottieHandle>
  subscriptions: Partial<LottieSubscriptions>
  className?: string
}

const AuthLottiePlayer = Lottie as unknown as ComponentType<LottiePlayerProps>

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
  const playerRef = useRef<LottieHandle>(null)
  const pauseOnReady = useRef(false)
  const [paused, setPaused] = useState(false)
  const mounted = useMounted()
  const prefersReduced = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  )

  const animationData = {
    loading: loadingAnimation,
    savings: savingsAnimation,
    success: successAnimation,
  }[variant]

  const subscriptions: Partial<LottieSubscriptions> = {
    ready: () => {
      if (pauseOnReady.current) playerRef.current?.pause()
      else if (autoplay) playerRef.current?.play()
    },
    pause: () => setPaused(true),
    play: () => {
      pauseOnReady.current = false
      setPaused(false)
    },
  }

  function togglePlayback() {
    if (paused) {
      pauseOnReady.current = false
      playerRef.current?.play()
      setPaused(false)
      return
    }
    pauseOnReady.current = true
    playerRef.current?.pause()
    setPaused(true)
  }

  if (!mounted || prefersReduced) {
    const Icon =
      variant === 'loading' ? LoaderCircle : variant === 'success' ? BadgeCheck : CircleDollarSign
    return (
      <div
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`flex items-center justify-center text-[#7B3FF2] ${className}`}
      >
        <Icon
          className={`h-3/4 w-3/4 ${variant === 'loading' ? 'motion-safe:animate-spin' : ''}`}
        />
      </div>
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      <AuthLottiePlayer
        src={animationData}
        loop={loop}
        // Start after the player is ready so the component can offer its own
        // pause control instead of delegating uncontrolled autoplay to Lottie.
        autoplay={false}
        lottieRef={playerRef}
        subscriptions={subscriptions}
        className="h-full w-full"
      />
      {autoplay && loop && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={paused ? 'Play animation' : 'Pause animation'}
          aria-pressed={paused}
          title={paused ? 'Play animation' : 'Pause animation'}
          className="absolute -right-2 -top-2 z-10 flex size-6 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-800 shadow-sm transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
        >
          {paused ? <Play aria-hidden="true" className="size-3" /> : <Pause aria-hidden="true" className="size-3" />}
        </button>
      )}
    </div>
  )
}
