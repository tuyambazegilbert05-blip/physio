'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { gsap } from 'gsap'
import { StageThreeBackground } from '@/components/auth/StageThreeBackground'
import { AuthLottie } from '@/components/auth/AuthLottie'

type AnimatedStageOrbitProps = {
  isMobile?: boolean
  className?: string
  lang?: 'en' | 'rw'
}

export function AnimatedStageOrbit({ isMobile = false, className = '', lang = 'en' }: AnimatedStageOrbitProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const logoWrapperRef = useRef<HTMLDivElement>(null)

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
      payoutMember: '.',
      payoutDate: 'Gatanu, 9 Ukwira',
      fundTitle: 'Ikigega cy’itsinda',
      headline: 'Buri musanzu, ugendera ku gihe.',
      subline: 'Imisanzu, inguzanyo n’inyungu by’itsinda ryawe ryose ahantu hamwe.',
    },
  }[lang]

  // GSAP Entrance Timeline & Continuous Orbit Choreography
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (prefersReduced) return

      // Entrance animation
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      if (svgRef.current) {
        tl.fromTo(
          svgRef.current,
          { scale: 0.82, opacity: 0, rotation: -15, transformOrigin: '50% 50%' },
          { scale: 1, opacity: 1, rotation: 0, duration: 1.1, ease: 'power2.out' },
          0
        )
      }

      if (logoWrapperRef.current) {
        tl.fromTo(
          logoWrapperRef.current,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.0, ease: 'back.out(1.8)' },
          0.1
        )
      }

      // Continuous Fluid Orbit Rotations (Noticeable and graceful speeds)
      gsap.to('.orbit-beads-inner', {
        rotation: 360,
        svgOrigin: '260 250',
        transformOrigin: '260px 250px',
        repeat: -1,
        duration: 14,
        ease: 'none',
      })

      gsap.to('.orbit-beads-dotted', {
        rotation: -360,
        svgOrigin: '260 250',
        transformOrigin: '260px 250px',
        repeat: -1,
        duration: 18,
        ease: 'none',
      })

      gsap.to('.orbit-beads-outer', {
        rotation: 360,
        svgOrigin: '260 250',
        transformOrigin: '260px 250px',
        repeat: -1,
        duration: 24,
        ease: 'none',
      })

      // Dotted orbit ring subtle breathing pulse
      gsap.to('.orbit-ring-dotted', {
        scale: 1.025,
        transformOrigin: '260px 250px',
        repeat: -1,
        yoyo: true,
        duration: 3.5,
        ease: 'sine.inOut',
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

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
                <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#2437F5" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <circle cx="160" cy="140" r="95" fill="none" stroke="url(#mobOrbitGrad)" strokeWidth="1.5" />
            <circle
              cx="160"
              cy="140"
              r="130"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              strokeOpacity="0.45"
            />
            <g className="orbit-beads-inner" style={{ transformOrigin: '160px 140px' }}>
              <circle cx="248" cy="100" r="5.5" fill="#2437F5" className="filter drop-shadow-[0_0_6px_#2437F5]" />
            </g>
            <g className="orbit-beads-dotted" style={{ transformOrigin: '160px 140px' }}>
              <circle cx="100" cy="50" r="4.5" fill="#1FB8F0" className="filter drop-shadow-[0_0_6px_#1FB8F0]" />
            </g>
          </svg>

          {/* Center P Logo with Levitation */}
          <motion.div
            ref={logoWrapperRef}
            animate={{ y: [-5, 5, -5], scale: [1, 1.02, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 flex items-center justify-center"
          >
            <div className="absolute w-28 h-28 bg-gradient-to-tr from-cyan-400/35 to-violet-500/30 blur-xl rounded-full pointer-events-none" />
            <Image
              src="/animated_log/logo_assemble_transparent.gif"
              alt="Physio Fund Circle logo"
              width={145}
              height={165}
              priority
              loading="eager"
              unoptimized
              style={{ width: 'auto', height: 'auto', maxHeight: '165px' }}
              className="relative z-10 drop-shadow-[0_14px_28px_rgba(36,55,245,0.25)] select-none pointer-events-none"
            />
          </motion.div>

          {/* Mobile Top Floating Stat Card (Cycle 4 contributions) */}
          <motion.div
            animate={{ y: [-7, 7, -7] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.03 }}
            className="absolute top-1 -right-1 z-20 w-[190px] bg-white/95 backdrop-blur-md rounded-[18px] p-3.5 shadow-[0_14px_30px_-6px_rgba(36,55,245,0.18)] border border-white/90 cursor-default"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{content.cycleTitle}</p>
              <AuthLottie variant="savings" size={24} />
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

  return (
    <div ref={containerRef} className={`relative flex flex-col justify-between h-full select-none ${className}`}>
      {/* Background ambient radial glows */}
      <div className="absolute top-[28%] left-[28%] -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-gradient-to-tr from-cyan-400/22 via-violet-500/18 to-indigo-500/15 blur-[110px] rounded-full pointer-events-none" />

      {/* Main Orbit Stage */}
      <div className="relative flex-1 flex items-center justify-center min-h-[420px] xl:min-h-[460px]">
        {/* Orbit System Stage Container */}
        <div className="relative w-[520px] h-[520px] flex items-center justify-center">
          {/* 1. THREE.JS 3D Scene Layer (Glossy spheres, lights, 3D toruses, mouse parallax) */}
          <StageThreeBackground className="z-0" />

          {/* 2. Vector Orbit SVG (Rings & Beads rotated by GSAP) */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-1"
            viewBox="0 0 520 520"
          >
            <defs>
              <linearGradient id="innerOrbitGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#2437F5" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.65" />
              </linearGradient>
              <linearGradient id="outerArcGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#1FB8F0" stopOpacity="0.55" />
              </linearGradient>
              <radialGradient id="sphereGradBlue3" cx="35%" cy="35%" r="65%">
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
              stroke="url(#innerOrbitGrad3)"
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
              stroke="url(#outerArcGrad3)"
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

            {/* GSAP Rotating Bead Groups */}
            {/* Inner Orbit Bead */}
            <g className="orbit-beads-inner" style={{ transformOrigin: '260px 250px' }}>
              <circle
                cx="395"
                cy="180"
                r="9"
                fill="url(#sphereGradBlue3)"
                className="filter drop-shadow-[0_2px_8px_rgba(36,55,245,0.5)]"
              />
            </g>

            {/* Dotted Orbit Cyan Bead */}
            <g className="orbit-beads-dotted" style={{ transformOrigin: '260px 250px' }}>
              <circle
                cx="195"
                cy="65"
                r="6"
                fill="#1FB8F0"
                className="filter drop-shadow-[0_0_10px_#1FB8F0]"
              />
            </g>

            {/* Outer Orbit Beads */}
            <g className="orbit-beads-outer" style={{ transformOrigin: '260px 250px' }}>
              <circle
                cx="502"
                cy="230"
                r="6"
                fill="#2DE1B9"
                className="filter drop-shadow-[0_0_10px_#2DE1B9]"
              />
              <circle
                cx="370"
                cy="410"
                r="8"
                fill="url(#sphereGradBlue3)"
                className="filter drop-shadow-[0_2px_8px_rgba(36,55,245,0.45)]"
              />
            </g>
          </svg>

          {/* 3. Center 3D P Logo with Breathing Levitation */}
          <div ref={logoWrapperRef} className="relative z-10 flex items-center justify-center">
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-56 h-56 bg-gradient-to-tr from-[#1FB8F0]/30 via-[#7B3FF2]/25 to-blue-500/25 blur-2xl rounded-full"
            />
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/animated_log/logo_assemble_transparent.gif"
                alt="Physio Fund Circle logo"
                width={200}
                height={230}
                priority
                loading="eager"
                unoptimized
                style={{ width: 'auto', height: 'auto', maxHeight: '230px' }}
                className="relative z-10 drop-shadow-[0_24px_48px_rgba(36,55,245,0.28)] select-none pointer-events-none"
              />
            </motion.div>
          </div>

          {/* 4. MOTION LEVITATING GLASS CARDS */}

          {/* Glass Card 1: Cycle 4 contributions (Top-Left) with Lottie Indicator */}
          <motion.div
            animate={{
              y: [-12, 10, -12],
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
              {/* Lottie Animation 1 */}
              <div className="pointer-events-none">
                <AuthLottie variant="savings" size={26} />
              </div>
            </div>
            <p className="font-heading font-extrabold text-2xl text-[#081233] leading-none mt-1">92%</p>
            <div className="h-2 w-full bg-slate-100/90 rounded-full overflow-hidden my-2.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#2437F5] to-[#7B3FF2]"
              />
            </div>
            <p className="text-[11px] text-slate-500 font-medium font-sans">{content.cyclePaid}</p>
          </motion.div>

          {/* Glass Card 2: Next payout (Top-Right) */}
          <motion.div
            animate={{
              y: [12, -10, 12],
            }}
            transition={{
              duration: 5.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
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

          {/* Glass Card 3: Group fund (Bottom-Left) with Animated Sparkline & Lottie */}
          <motion.div
            animate={{
              y: [-10, 12, -10],
            }}
            transition={{
              duration: 4.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1.0,
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
                  <linearGradient id="sparklineGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1FB8F0" />
                    <stop offset="100%" stopColor="#7B3FF2" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 25 C 30 23, 45 19, 75 17 C 105 15, 125 8, 160 6 L 160 32 L 0 32 Z"
                  fill="url(#sparklineGrad3)"
                />
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, delay: 0.4, ease: 'easeInOut' }}
                  d="M 0 25 C 30 23, 45 19, 75 17 C 105 15, 125 8, 160 6"
                  fill="none"
                  stroke="url(#lineGrad3)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
        className="relative z-10 mt-2 xl:mt-4 max-w-xl"
      >
        <h2 className="font-heading font-extrabold text-[34px] xl:text-[40px] text-[#081233] tracking-tight leading-[1.15]">
          {content.headline}
        </h2>
        <p className="font-sans text-[14px] xl:text-[15px] text-[#657089] mt-2 max-w-[440px] leading-relaxed">
          {content.subline}
        </p>
      </motion.div>
    </div>
  )
}
