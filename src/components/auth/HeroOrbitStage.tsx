'use client'

import Image from 'next/image'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { motion } from 'motion/react'
import { gsap } from 'gsap'
import { StageThreeBackground } from '@/components/auth/StageThreeBackground'
import { AuthLottie } from '@/components/auth/AuthLottie'

export type HeroOrbitStageProps = {
  isMobile?: boolean
  className?: string
  lang?: 'en' | 'rw'
}

const desktopQuery = '(min-width: 64rem)'

function subscribeToDesktopLayout(onChange: () => void) {
  const media = window.matchMedia(desktopQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getDesktopLayoutSnapshot() {
  return window.matchMedia(desktopQuery).matches
}

export function HeroOrbitStage({ isMobile = false, className = '', lang = 'en' }: HeroOrbitStageProps) {
  const desktopLayout = useSyncExternalStore(subscribeToDesktopLayout, getDesktopLayoutSnapshot, () => null)
  const loadHeroEagerly = desktopLayout !== null && isMobile !== desktopLayout
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const card1Ref = useRef<HTMLDivElement>(null)
  const card2Ref = useRef<HTMLDivElement>(null)
  const card3Ref = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const content = {
    en: {
      cycleTitle: 'Cycle 4 contributions',
      cyclePaid: '46 of 50 members paid',
      payoutTitle: 'Next payout',
      payoutMember: 'Mukamana A.',
      payoutDate: 'Fri, 9 Oct',
      fundTitle: 'Group fund',
      headline: 'Every contribution, in orbit.',
      subline: 'Contributions, loans and payouts for your whole group, in one live view.',
    },
    rw: {
      cycleTitle: 'Imisanzu y’Icyiciro cya 4',
      cyclePaid: '46 mu banyamuryango 50 bishyuye',
      payoutTitle: 'Umuhigo utaha',
      payoutMember: 'Mukamana A.',
      payoutDate: 'Gatanu, 9 Ukwira',
      fundTitle: 'Ikigega cy’itsinda',
      headline: 'Buri musanzu, ugendera ku gihe.',
      subline: 'Imisanzu, inguzanyo n’inyungu by’itsinda ryawe ryose ahantu hamwe.',
    },
  }[lang]

  // GSAP Entrance Timeline: Smooth entrance that settles at natural opacity: 1
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      // 1. Orbit rings zoom and rotate in
      if (svgRef.current) {
        tl.from(
          svgRef.current,
          { scale: 0.65, opacity: 0, rotation: -35, duration: 1.1, ease: 'back.out(1.2)' },
          0
        )
      }

      // 2. Central assembling logo pops in with bounce
      if (logoRef.current) {
        tl.from(
          logoRef.current,
          { scale: 0.25, opacity: 0, y: 35, duration: 1.0, ease: 'back.out(2.0)' },
          0.12
        )
      }

      // 3. Floating glass cards cascade in
      if (card1Ref.current) {
        tl.from(
          card1Ref.current,
          { x: -60, y: -25, opacity: 0, scale: 0.85, duration: 0.85, ease: 'power2.out' },
          0.3
        )
      }

      if (card2Ref.current) {
        tl.from(
          card2Ref.current,
          { x: 60, y: -20, opacity: 0, scale: 0.85, duration: 0.85, ease: 'power2.out' },
          0.45
        )
      }

      if (card3Ref.current) {
        tl.from(
          card3Ref.current,
          { x: -50, y: 40, opacity: 0, scale: 0.85, duration: 0.85, ease: 'power2.out' },
          0.6
        )
      }

      // 4. Headline text glides up
      if (textRef.current) {
        tl.from(
          textRef.current,
          { y: 30, opacity: 0, duration: 0.8, ease: 'power2.out' },
          0.45
        )
      }
    }, containerRef)

    return () => ctx.revert()
  }, [])

  // MOBILE VIEW (< lg)
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className={`relative flex flex-col items-center justify-center pt-2 pb-6 px-4 overflow-hidden select-none ${className}`}
      >
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-tr from-cyan-400/25 via-violet-500/25 to-blue-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Orbit container */}
        <div className="relative w-[320px] h-[280px] flex items-center justify-center">
          {/* SVG Orbit Rings */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 320 280"
          >
            <defs>
              <linearGradient id="mobOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#2437F5" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            <circle cx="160" cy="140" r="95" fill="none" stroke="url(#mobOrbitGrad)" strokeWidth="1.8" />
            <circle
              cx="160"
              cy="140"
              r="130"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.3"
              strokeDasharray="3 6"
              strokeOpacity="0.5"
            />
            {/* Spinning Beads */}
            <g
              className="animate-spin-orbit-mobile"
              style={{ transformBox: 'view-box', transformOrigin: '160px 140px' }}
            >
              <circle cx="248" cy="100" r="6" fill="#2437F5" className="filter drop-shadow-[0_0_8px_#2437F5]" />
            </g>
            <g
              className="animate-spin-orbit-mobile-reverse"
              style={{ transformBox: 'view-box', transformOrigin: '160px 140px' }}
            >
              <circle cx="100" cy="50" r="5" fill="#1FB8F0" className="filter drop-shadow-[0_0_8px_#1FB8F0]" />
            </g>
          </svg>

          {/* Center P Logo with Levitation */}
          <motion.div
            ref={logoRef}
            animate={{ y: [-5, 5, -5], scale: [1, 1.025, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 flex items-center justify-center"
          >
            <div className="absolute w-28 h-28 bg-gradient-to-tr from-cyan-400/35 to-violet-500/30 blur-xl rounded-full pointer-events-none" />
            <Image
              src="/animated_log/logo_assemble_transparent.gif"
              alt="Physio Fund Cycle logo"
              width={150}
              height={150}
              loading={loadHeroEagerly ? 'eager' : 'lazy'}
              unoptimized
              style={{
                width: "150px",
                height: "150px",
                maxWidth: "150px",
                maxHeight: "150px",
                objectFit: "contain",
              }}
              className="relative z-10 drop-shadow-[0_14px_28px_rgba(36,55,245,0.25)] select-none pointer-events-none"
            />
          </motion.div>

          {/* Mobile Top Floating Stat Card */}
          <motion.div
            ref={card1Ref}
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.03 }}
            className="absolute top-1 -right-1 z-20 w-[190px] bg-white/95 backdrop-blur-md rounded-[18px] p-3.5 shadow-[0_14px_30px_-6px_rgba(36,55,245,0.18)] border border-white/90 cursor-default"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{content.cycleTitle}</p>
              <AuthLottie variant="savings" size={26} />
            </div>
            <p className="font-heading font-extrabold text-xl text-[#081233] leading-none mt-1">92%</p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#2437F5] to-[#7B3FF2]"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">{content.cyclePaid}</p>
          </motion.div>
        </div>
      </div>
    )
  }

  // DESKTOP VIEW (lg+)
  return (
    <div ref={containerRef} className={`relative flex flex-col justify-between h-full select-none ${className}`}>
      {/* Background ambient radial glows */}
      <div className="absolute top-[28%] left-[28%] -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-gradient-to-tr from-cyan-400/22 via-violet-500/18 to-indigo-500/15 blur-[110px] rounded-full pointer-events-none" />

      {/* Main Orbit Stage */}
      <div className="relative flex-1 flex items-center justify-center min-h-[420px] xl:min-h-[460px]">
        {/* Orbit System Stage Container */}
        <div className="relative w-[520px] h-[520px] flex items-center justify-center">
          {/* 1. THREE.JS 3D Scene Layer (Glossy brand spheres, luminous 3D toruses, mouse parallax) */}
          <StageThreeBackground className="z-0" />

          {/* 2. Vector Orbit SVG (Concentric rings & beads spinning in orbits) */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-1"
            viewBox="0 0 520 520"
          >
            <defs>
              <linearGradient id="innerOrbitGradHero" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#2437F5" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.65" />
              </linearGradient>
              <linearGradient id="outerArcGradHero" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#1FB8F0" stopOpacity="0.6" />
              </linearGradient>
              <radialGradient id="sphereGradBlueHero" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="50%" stopColor="#2437F5" />
                <stop offset="100%" stopColor="#1E1B4B" />
              </radialGradient>
            </defs>

            {/* Inner orbit ring */}
            <circle
              cx="260"
              cy="250"
              r="150"
              fill="none"
              stroke="url(#innerOrbitGradHero)"
              strokeWidth="2.0"
            />

            {/* Dotted middle orbit circle */}
            <circle
              className="orbit-ring-dotted"
              cx="260"
              cy="250"
              r="205"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.4"
              strokeDasharray="4 8"
              strokeOpacity="0.5"
            />

            {/* Outer smooth orbit circle */}
            <circle
              cx="260"
              cy="250"
              r="245"
              fill="none"
              stroke="url(#outerArcGradHero)"
              strokeWidth="1.4"
              strokeOpacity="0.45"
            />

            {/* Diagonal ray extending to bottom-left */}
            <line
              x1="100"
              y1="400"
              x2="55"
              y2="450"
              stroke="#818CF8"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
            <circle cx="55" cy="450" r="5" fill="#818CF8" fillOpacity="0.9" />

            {/* Cyan highlight arc segment */}
            <path
              d="M 405 225 A 150 150 0 0 1 408 265"
              fill="none"
              stroke="#1FB8F0"
              strokeWidth="4.5"
              strokeLinecap="round"
              className="filter drop-shadow-[0_0_8px_#1FB8F0]"
            />

            {/* Orbiting Beads Groups (Smooth Hardware-Accelerated Continuous Rotations) */}
            {/* Inner Orbit Bead */}
            <g
              className="animate-spin-orbit"
              style={{ transformBox: 'view-box', transformOrigin: '260px 250px' }}
            >
              <circle
                cx="395"
                cy="180"
                r="9"
                fill="url(#sphereGradBlueHero)"
                className="filter drop-shadow-[0_2px_8px_rgba(36,55,245,0.5)]"
              />
            </g>

            {/* Dotted Orbit Cyan Bead */}
            <g
              className="animate-spin-orbit-reverse"
              style={{ transformBox: 'view-box', transformOrigin: '260px 250px' }}
            >
              <circle
                cx="195"
                cy="65"
                r="6.5"
                fill="#1FB8F0"
                className="filter drop-shadow-[0_0_10px_#1FB8F0]"
              />
            </g>

            {/* Outer Orbit Beads */}
            <g
              className="animate-spin-orbit-slow"
              style={{ transformBox: 'view-box', transformOrigin: '260px 250px' }}
            >
              <circle
                cx="502"
                cy="230"
                r="6.5"
                fill="#2DE1B9"
                className="filter drop-shadow-[0_0_10px_#2DE1B9]"
              />
              <circle
                cx="370"
                cy="410"
                r="8.5"
                fill="url(#sphereGradBlueHero)"
                className="filter drop-shadow-[0_2px_8px_rgba(36,55,245,0.45)]"
              />
            </g>
          </svg>

          {/* 3. Center Logo with Breathing Levitation & Glow */}
          <div ref={logoRef} className="relative z-10 flex items-center justify-center">
            <motion.div
              animate={{
                scale: [1, 1.12, 1],
                opacity: [0.55, 0.85, 0.55],
              }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-56 h-56 bg-gradient-to-tr from-[#1FB8F0]/30 via-[#7B3FF2]/25 to-blue-500/25 blur-2xl rounded-full pointer-events-none"
            />
            <motion.div
              animate={{ y: [-7, 7, -7] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/animated_log/logo_assemble_transparent.gif"
                alt="Physio Fund Cycle logo"
                width={220}
                height={220}
                loading={loadHeroEagerly ? 'eager' : 'lazy'}
                unoptimized
                style={{
                  width: "220px",
                  height: "220px",
                  maxWidth: "220px",
                  maxHeight: "220px",
                  objectFit: "contain",
                }}
                className="relative z-10 drop-shadow-[0_24px_48px_rgba(36,55,245,0.28)] select-none pointer-events-none"
              />
            </motion.div>
          </div>

          {/* 4. MOTION LEVITATING GLASS CARDS */}

          {/* Glass Card 1: Cycle 4 contributions (Top-Left) with Lottie Indicator */}
          <motion.div
            ref={card1Ref}
            animate={{
              y: [-10, 10, -10],
              rotate: [-0.6, 0.6, -0.6],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            whileHover={{
              scale: 1.05,
              y: -14,
              boxShadow: '0 26px 52px -10px rgba(36,55,245,0.25)',
              transition: { type: 'spring', stiffness: 350, damping: 20 },
            }}
            whileTap={{ scale: 0.98 }}
            className="absolute top-[25px] left-[0px] xl:left-[-15px] z-20 w-[215px] bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-[0_18px_40px_-8px_rgba(36,55,245,0.16),0_2px_8px_-2px_rgba(36,55,245,0.06)] border border-slate-100/80 cursor-default"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500 font-sans">{content.cycleTitle}</p>
              {/* Lottie Animation */}
              <div className="pointer-events-none">
                <AuthLottie variant="savings" size={28} />
              </div>
            </div>
            <p className="font-heading font-extrabold text-2xl text-[#081233] leading-none mt-1">92%</p>
            <div className="h-2 w-full bg-slate-100/90 rounded-full overflow-hidden my-2.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#2437F5] to-[#7B3FF2]"
              />
            </div>
            <p className="text-[11px] text-slate-500 font-medium font-sans">{content.cyclePaid}</p>
          </motion.div>

          {/* Glass Card 2: Next payout (Top-Right) */}
          <motion.div
            ref={card2Ref}
            animate={{
              y: [12, -10, 12],
              rotate: [0.6, -0.6, 0.6],
            }}
            transition={{
              duration: 5.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
            whileHover={{
              scale: 1.05,
              y: -14,
              boxShadow: '0 26px 52px -10px rgba(36,55,245,0.25)',
              transition: { type: 'spring', stiffness: 350, damping: 20 },
            }}
            whileTap={{ scale: 0.98 }}
            className="absolute top-[95px] right-[-10px] xl:right-[-30px] z-20 w-[240px] bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-[0_18px_40px_-8px_rgba(36,55,245,0.16),0_2px_8px_-2px_rgba(36,55,245,0.06)] border border-slate-100/80 cursor-default"
          >
            <p className="text-[12px] text-slate-500 font-medium font-sans mb-2">{content.payoutTitle}</p>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-[#7B3FF2] text-white font-heading font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                MA
              </div>
              <div className="truncate">
                <p className="font-bold text-[13px] text-[#081233] truncate font-sans leading-tight">
                  {content.payoutMember}
                </p>
                <p className="text-[11px] text-slate-400 font-medium font-sans">{content.payoutDate}</p>
              </div>
            </div>
            <p className="font-heading font-extrabold text-[19px] text-[#081233] tracking-tight">
              RWF 2,400,000
            </p>
          </motion.div>

          {/* Glass Card 3: Group fund (Bottom-Left) with Animated Sparkline */}
          <motion.div
            ref={card3Ref}
            animate={{
              y: [-8, 12, -8],
              rotate: [-0.5, 0.5, -0.5],
            }}
            transition={{
              duration: 4.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.8,
            }}
            whileHover={{
              scale: 1.05,
              y: -14,
              boxShadow: '0 26px 52px -10px rgba(36,55,245,0.25)',
              transition: { type: 'spring', stiffness: 350, damping: 20 },
            }}
            whileTap={{ scale: 0.98 }}
            className="absolute bottom-[40px] left-[15px] xl:left-[0px] z-20 w-[215px] bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-[0_18px_40px_-8px_rgba(36,55,245,0.16),0_2px_8px_-2px_rgba(36,55,245,0.06)] border border-slate-100/80 cursor-default"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[12px] text-slate-500 font-medium font-sans">{content.fundTitle}</p>
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#087f5b] bg-[#2DE1B9]/25 px-2 py-0.5 rounded-full font-sans">
                ▲ 6.2%
              </span>
            </div>
            <p className="font-heading font-extrabold text-xl text-[#081233] mb-1">RWF 18.4M</p>

            {/* Dynamic Animated Sparkline curve */}
            <div className="w-full h-8 pt-1">
              <svg viewBox="0 0 160 32" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparklineGradHero" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGradHero" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1FB8F0" />
                    <stop offset="100%" stopColor="#7B3FF2" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 25 C 30 23, 45 19, 75 17 C 105 15, 125 8, 160 6 L 160 32 L 0 32 Z"
                  fill="url(#sparklineGradHero)"
                />
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, delay: 0.5, ease: 'easeInOut' }}
                  d="M 0 25 C 30 23, 45 19, 75 17 C 105 15, 125 8, 160 6"
                  fill="none"
                  stroke="url(#lineGradHero)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Tagline */}
      <div ref={textRef} className="relative z-10 mt-2 xl:mt-4 max-w-xl">
        <h2 className="font-heading font-extrabold text-[34px] xl:text-[40px] text-[#081233] tracking-tight leading-[1.15]">
          {content.headline}
        </h2>
        <p className="font-sans text-[14px] xl:text-[15px] text-[#657089] mt-2 max-w-[440px] leading-relaxed">
          {content.subline}
        </p>
      </div>
    </div>
  )
}
