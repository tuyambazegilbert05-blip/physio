'use client'

import Image from 'next/image'

type StageOrbitProps = {
  isMobile?: boolean
  className?: string
  lang?: 'en' | 'rw'
}

export function StageOrbit({ isMobile = false, className = '', lang = 'en' }: StageOrbitProps) {
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
      <div className={`relative flex flex-col items-center justify-center pt-2 pb-6 px-4 overflow-hidden select-none ${className}`}>
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-tr from-cyan-400/20 via-violet-500/20 to-blue-500/15 blur-3xl rounded-full pointer-events-none" />

        {/* Orbit container */}
        <div className="relative w-[320px] h-[280px] flex items-center justify-center">
          {/* SVG Orbit Rings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 320 280">
            <defs>
              <linearGradient id="mobOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#2437F5" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <circle cx="160" cy="140" r="95" fill="none" stroke="url(#mobOrbitGrad)" strokeWidth="1.5" />
            <circle cx="160" cy="140" r="130" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 6" strokeOpacity="0.4" />
            <circle cx="248" cy="100" r="5" fill="#2437F5" />
            <circle cx="100" cy="50" r="4" fill="#1FB8F0" />
          </svg>

          {/* Center P Logo */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="absolute w-28 h-28 bg-gradient-to-tr from-cyan-400/30 to-violet-500/25 blur-xl rounded-full pointer-events-none" />
            <Image
              src="/animated_log/logo_assemble_transparent.gif"
              alt="Physio Fund Circle Logo"
              width={150}
              height={150}
              priority
              loading="eager"
              unoptimized
              style={{
                width: '150px',
                height: '150px',
                maxWidth: '150px',
                maxHeight: '150px',
                objectFit: 'contain',
              }}
              className="relative z-10 drop-shadow-[0_12px_24px_rgba(36,55,245,0.22)] select-none pointer-events-none"
            />
          </div>

          {/* Mobile Top Floating Stat Card (Cycle 4 contributions) */}
          <div className="absolute top-1 -right-1 z-20 w-[190px] bg-white/95 backdrop-blur-md rounded-[18px] p-3.5 shadow-[0_12px_28px_-6px_rgba(36,55,245,0.14)] border border-white/90">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{content.cycleTitle}</p>
            <p className="font-heading font-extrabold text-xl text-[#081233] leading-none mt-1">92%</p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-2">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] w-[92%]" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">{content.cyclePaid}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col justify-between h-full select-none ${className}`}>
      {/* Background ambient radial glows */}
      <div className="absolute top-[28%] left-[28%] -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-gradient-to-tr from-cyan-400/18 via-violet-500/14 to-indigo-500/12 blur-[110px] rounded-full pointer-events-none" />

      {/* Main Orbit Stage */}
      <div className="relative flex-1 flex items-center justify-center min-h-[420px] xl:min-h-[460px]">
        {/* Orbit System SVG and Rings */}
        <div className="relative w-[520px] h-[520px] flex items-center justify-center">
          {/* Vector Orbit SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 520 520">
            <defs>
              <linearGradient id="innerOrbitGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#2437F5" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="outerArcGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#1FB8F0" stopOpacity="0.5" />
              </linearGradient>
              <radialGradient id="sphereGradBlue2" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="50%" stopColor="#2437F5" />
                <stop offset="100%" stopColor="#1E1B4B" />
              </radialGradient>
            </defs>

            {/* 1. Inner orbit ring */}
            <circle
              cx="260"
              cy="250"
              r="150"
              fill="none"
              stroke="url(#innerOrbitGrad2)"
              strokeWidth="1.8"
            />

            {/* 2. Dotted middle orbit circle */}
            <circle
              cx="260"
              cy="250"
              r="205"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.2"
              strokeDasharray="4 8"
              strokeOpacity="0.45"
            />

            {/* 3. Outer smooth orbit circle */}
            <circle
              cx="260"
              cy="250"
              r="245"
              fill="none"
              stroke="url(#outerArcGrad2)"
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />

            {/* Diagonal ray extending to bottom-left */}
            <line
              x1="100"
              y1="400"
              x2="55"
              y2="450"
              stroke="#818CF8"
              strokeWidth="1.5"
              strokeOpacity="0.45"
            />
            {/* Dot on diagonal ray */}
            <circle cx="55" cy="450" r="5" fill="#818CF8" fillOpacity="0.8" />

            {/* Cyan highlight arc segment on right of inner ring */}
            <path
              d="M 405 225 A 150 150 0 0 1 408 265"
              fill="none"
              stroke="#1FB8F0"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Spherical Beads matching reference */}
            {/* Bead 1: Violet/Cobalt bead touching Next Payout card on inner orbit */}
            <circle cx="395" cy="180" r="8.5" fill="url(#sphereGradBlue2)" className="filter drop-shadow-[0_2px_6px_rgba(36,55,245,0.4)]" />

            {/* Bead 2: Cyan bead at ~11 o'clock on dotted orbit */}
            <circle cx="195" cy="65" r="5" fill="#1FB8F0" className="filter drop-shadow-[0_0_6px_#1FB8F0]" />

            {/* Bead 3: Mint bead at ~3 o'clock on outer orbit */}
            <circle cx="502" cy="230" r="5" fill="#2DE1B9" className="filter drop-shadow-[0_0_6px_#2DE1B9]" />

            {/* Bead 4: Cobalt bead at ~5 o'clock on outer orbit */}
            <circle cx="370" cy="410" r="7" fill="url(#sphereGradBlue2)" className="filter drop-shadow-[0_2px_6px_rgba(36,55,245,0.35)]" />
          </svg>

          {/* Center 3D P Logo */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="absolute w-52 h-52 bg-gradient-to-tr from-[#1FB8F0]/25 via-[#7B3FF2]/20 to-blue-500/20 blur-2xl rounded-full" />
            <Image
              src="/animated_log/logo_assemble_transparent.gif"
              alt="Physio Fund Circle Logo"
              width={220}
              height={220}
              priority
              loading="eager"
              unoptimized
              style={{
                width: '220px',
                height: '220px',
                maxWidth: '220px',
                maxHeight: '220px',
                objectFit: 'contain',
              }}
              className="relative z-10 drop-shadow-[0_24px_45px_rgba(36,55,245,0.24)] select-none pointer-events-none"
            />
          </div>

          {/* Glass Card 1: Cycle 4 contributions (Top-Left) */}
          <div className="absolute top-[25px] left-[0px] xl:left-[-15px] z-20 w-[205px] bg-white rounded-[22px] p-4 shadow-[0_16px_36px_-8px_rgba(36,55,245,0.13),0_2px_8px_-2px_rgba(36,55,245,0.05)] border border-slate-100/70">
            <p className="text-[11px] font-medium text-slate-500 font-sans">{content.cycleTitle}</p>
            <p className="font-heading font-extrabold text-2xl text-[#081233] leading-none mt-1">92%</p>
            <div className="h-2 w-full bg-slate-100/80 rounded-full overflow-hidden my-2.5">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] w-[92%]" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium font-sans">{content.cyclePaid}</p>
          </div>

          {/* Glass Card 2: Next payout (Top-Right) */}
          <div className="absolute top-[95px] right-[-10px] xl:right-[-30px] z-20 w-[235px] bg-white rounded-[22px] p-4 shadow-[0_16px_36px_-8px_rgba(36,55,245,0.13),0_2px_8px_-2px_rgba(36,55,245,0.05)] border border-slate-100/70">
            <p className="text-[12px] text-slate-500 font-medium font-sans mb-2">{content.payoutTitle}</p>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-[#7B3FF2] text-white font-heading font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                MA
              </div>
              <div className="truncate">
                <p className="font-bold text-[13px] text-[#081233] truncate font-sans leading-tight">{content.payoutMember}</p>
                <p className="text-[11px] text-slate-400 font-medium font-sans">{content.payoutDate}</p>
              </div>
            </div>
            <p className="font-heading font-extrabold text-[19px] text-[#081233] tracking-tight">RWF 2,400,000</p>
          </div>

          {/* Glass Card 3: Group fund (Bottom-Left) */}
          <div className="absolute bottom-[40px] left-[15px] xl:left-[0px] z-20 w-[210px] bg-white rounded-[22px] p-4 shadow-[0_16px_36px_-8px_rgba(36,55,245,0.13),0_2px_8px_-2px_rgba(36,55,245,0.05)] border border-slate-100/70">
            <p className="text-[12px] text-slate-500 font-medium font-sans mb-1">{content.fundTitle}</p>
            <div className="flex items-center justify-between mb-1">
              <p className="font-heading font-extrabold text-xl text-[#081233]">RWF 18.4M</p>
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#087f5b] bg-[#2DE1B9]/25 px-2 py-0.5 rounded-full font-sans">
                ▲ 6.2%
              </span>
            </div>
            {/* Sparkline curve */}
            <div className="w-full h-7 pt-1">
              <svg viewBox="0 0 160 32" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparklineGradRef2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1FB8F0" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGradRef2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1FB8F0" />
                    <stop offset="100%" stopColor="#7B3FF2" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 25 C 30 23, 45 19, 75 17 C 105 15, 125 8, 160 6 L 160 32 L 0 32 Z"
                  fill="url(#sparklineGradRef2)"
                />
                <path
                  d="M 0 25 C 30 23, 45 19, 75 17 C 105 15, 125 8, 160 6"
                  fill="none"
                  stroke="url(#lineGradRef2)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tagline */}
      <div className="relative z-10 mt-2 xl:mt-4 max-w-xl">
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
