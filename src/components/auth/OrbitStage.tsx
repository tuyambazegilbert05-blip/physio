'use client'

import Image from 'next/image'

type OrbitStageProps = {
  isMobile?: boolean
  className?: string
  lang?: 'en' | 'rw'
}

export function OrbitStage({ isMobile = false, className = '', lang = 'en' }: OrbitStageProps) {
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

  if (isMobile) {
    return (
      <div className={`relative flex flex-col items-center justify-center pt-2 pb-6 px-4 overflow-hidden ${className}`}>
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-cyan-400/20 via-violet-500/20 to-blue-500/15 blur-3xl rounded-full pointer-events-none" />

        {/* Orbit container */}
        <div className="relative w-[310px] h-[270px] flex items-center justify-center">
          {/* Inner orbit ring */}
          <div className="absolute w-[220px] h-[220px] rounded-full border border-indigo-300/40 animate-spin-orbit pointer-events-none">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#1FB8F0] shadow-[0_0_8px_#1FB8F0]" />
          </div>

          {/* Outer orbit ring */}
          <div className="absolute w-[290px] h-[290px] rounded-full border border-indigo-200/30 border-dashed animate-spin-orbit-slow pointer-events-none">
            <span className="absolute bottom-6 right-6 w-3 h-3 rounded-full bg-[#7B3FF2] shadow-[0_0_8px_#7B3FF2]" />
          </div>

          {/* Center P Logo */}
          <div className="relative z-10 flex items-center justify-center">
            <Image
              src="/animated_log/logo_assemble_transparent.gif"
              alt="Phyaio Cycle Logo"
              width={140}
              height={160}
              priority
              loading="eager"
              unoptimized
              style={{ width: 'auto', height: 'auto' }}
              className="drop-shadow-[0_12px_24px_rgba(36,55,245,0.18)] select-none pointer-events-none"
            />
          </div>

          {/* Mobile Top Floating Stat Card (Cycle 4 contributions) */}
          <div className="absolute top-1 -right-1 z-20 w-[190px] bg-white/95 backdrop-blur-md rounded-[18px] p-3 shadow-glass-card border border-white/90 animate-float-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{content.cycleTitle}</p>
            <p className="font-heading font-extrabold text-xl text-[#081233] leading-none mt-1">92%</p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-1.5">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] w-[92%]" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">{content.cyclePaid}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col justify-between h-full p-8 lg:p-12 xl:p-16 select-none ${className}`}>
      {/* Background ambient radial glow */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-cyan-400/20 via-violet-500/15 to-indigo-500/15 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Orbit Stage */}
      <div className="relative flex-1 flex items-center justify-center min-h-[460px] lg:min-h-[520px]">
        {/* Orbit System SVG and Rings */}
        <div className="relative w-[500px] h-[500px] flex items-center justify-center">
          {/* Outer dashed orbit circle */}
          <div className="absolute w-[490px] h-[490px] rounded-full border border-indigo-200/40 border-dashed animate-spin-orbit-slow pointer-events-none">
            <span className="absolute top-12 left-16 w-2.5 h-2.5 rounded-full bg-[#1FB8F0] shadow-[0_0_8px_#1FB8F0]" />
          </div>

          {/* Middle orbit circle */}
          <div className="absolute w-[400px] h-[400px] rounded-full border border-indigo-300/35 animate-spin-orbit pointer-events-none">
            <span className="absolute top-8 right-12 w-3.5 h-3.5 rounded-full bg-[#2437F5] shadow-[0_0_10px_#2437F5]" />
            <span className="absolute bottom-16 left-8 w-2.5 h-2.5 rounded-full bg-[#7B3FF2] shadow-[0_0_8px_#7B3FF2]" />
          </div>

          {/* Inner orbit circle */}
          <div className="absolute w-[290px] h-[290px] rounded-full border border-blue-400/25 animate-spin-orbit-reverse pointer-events-none">
            <span className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#1FB8F0] shadow-[0_0_8px_#1FB8F0]" />
          </div>

          {/* Center P Logo */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="absolute w-48 h-48 bg-gradient-to-tr from-[#1FB8F0]/30 to-[#7B3FF2]/25 blur-2xl rounded-full" />
            <Image
              src="/animated_log/logo_assemble_transparent.gif"
              alt="Phyaio Cycle Logo"
              width={210}
              height={240}
              priority
              loading="eager"
              unoptimized
              style={{ width: 'auto', height: 'auto' }}
              className="relative z-10 drop-shadow-[0_20px_35px_rgba(36,55,245,0.22)] transform hover:scale-105 transition-transform duration-500 pointer-events-none"
            />
          </div>

          {/* Glass Card 1: Cycle 4 contributions (Top-Left) */}
          <div className="absolute -top-4 -left-4 xl:-left-8 z-20 w-[220px] bg-white/95 backdrop-blur-md rounded-[20px] p-4 shadow-glass-card border border-white/80 animate-float-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{content.cycleTitle}</p>
            <p className="font-heading font-extrabold text-2xl text-[#081233] leading-none mt-1">92%</p>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden my-2">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] w-[92%]" />
            </div>
            <p className="text-xs text-slate-500 font-medium">{content.cyclePaid}</p>
          </div>

          {/* Glass Card 2: Next payout (Top-Right) */}
          <div className="absolute top-12 -right-6 xl:-right-12 z-20 w-[240px] bg-white/95 backdrop-blur-md rounded-[20px] p-4 shadow-glass-card border border-white/80 animate-float-2">
            <p className="text-xs text-slate-500 font-medium mb-2">{content.payoutTitle}</p>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#7B3FF2] text-white font-heading font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                MA
              </div>
              <div className="truncate">
                <p className="font-bold text-xs text-[#081233] truncate">{content.payoutMember}</p>
                <p className="text-[11px] text-slate-400 font-medium">{content.payoutDate}</p>
              </div>
            </div>
            <p className="font-heading font-extrabold text-lg text-[#081233] tracking-tight">RWF 2,400,000</p>
          </div>

          {/* Glass Card 3: Group fund (Bottom-Left) */}
          <div className="absolute -bottom-6 -left-2 xl:-left-4 z-20 w-[220px] bg-white/95 backdrop-blur-md rounded-[20px] p-4 shadow-glass-card border border-white/80 animate-float-3">
            <p className="text-xs text-slate-500 font-medium mb-1">{content.fundTitle}</p>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-heading font-extrabold text-xl text-[#081233]">RWF 18.4M</p>
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#087f5b] bg-[#2DE1B9]/25 px-2 py-0.5 rounded-full">
                ▲ 6.2%
              </span>
            </div>
            {/* Sparkline curve */}
            <div className="w-full h-8 pt-1">
              <svg viewBox="0 0 160 36" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparklineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1FB8F0" />
                    <stop offset="100%" stopColor="#7B3FF2" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 28 C 30 26, 45 22, 75 20 C 105 18, 125 10, 160 8 L 160 36 L 0 36 Z"
                  fill="url(#sparklineGrad)"
                />
                <path
                  d="M 0 28 C 30 26, 45 22, 75 20 C 105 18, 125 10, 160 8"
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tagline */}
      <div className="relative z-10 mt-6 lg:mt-8 max-w-xl">
        <h2 className="font-heading font-extrabold text-3xl xl:text-4xl text-[#081233] tracking-tight leading-tight">
          {content.headline}
        </h2>
        <p className="font-sans text-sm xl:text-base text-slate-500 mt-2 leading-relaxed">
          {content.subline}
        </p>
      </div>
    </div>
  )
}
