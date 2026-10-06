'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { LanguageSwitch } from '@/components/auth/LanguageSwitch'
import { HeroOrbitStage } from '@/components/auth/HeroOrbitStage'
import { ActivateAccountCard } from '@/components/auth/ActivateAccountCard'

export function ActivateAccountView() {
  const [lang, setLang] = useState<'en' | 'rw'>('en')

  return (
    <div
      style={{
        backgroundColor: '#F8FAFF',
        backgroundImage:
          'linear-gradient(to right, rgba(99, 102, 241, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.08) 1px, transparent 1px)',
        backgroundSize: '42px 42px',
      }}
      className="min-h-screen w-full flex flex-col justify-between relative overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute -top-24 -right-24 w-[650px] h-[650px] bg-gradient-to-bl from-purple-500/14 via-indigo-500/08 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-400/14 via-blue-500/08 to-transparent blur-[130px] pointer-events-none rounded-full" />

      {/* Top Header */}
      <header className="w-full max-w-[1400px] mx-auto px-6 py-6 sm:px-10 flex items-center justify-between z-30 select-none">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <BrandLogo size={36} wordmarkClassName="font-heading font-extrabold text-[24px] text-[#081233]" />
        </Link>
        <LanguageSwitch currentLang={lang} onToggle={setLang} />
      </header>

      {/* Main Content: Split Desktop / Stacked Mobile */}
      <main className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-10 py-2 sm:py-6 z-20">
        {/* DESKTOP LAYOUT (lg+) */}
        <div className="hidden lg:grid lg:grid-cols-12 items-center gap-8 xl:gap-14 w-full">
          {/* Left Column */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center">
            <HeroOrbitStage isMobile={false} lang={lang} />
          </div>

          {/* Right Column: Activate Account Card */}
          <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center">
            <div className="w-full max-w-[540px]">
              <Suspense
                fallback={
                  <div
                    style={{ borderRadius: '28px', backgroundColor: '#FFFFFF' }}
                    className="w-full h-[540px] animate-pulse shadow-blue-tint p-8"
                  />
                }
              >
                <ActivateAccountCard lang={lang} />
              </Suspense>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT (< lg) */}
        <div className="lg:hidden flex flex-col items-center w-full max-w-md mx-auto">
          <HeroOrbitStage isMobile={true} lang={lang} className="w-full" />
          <div className="w-full px-2 pt-2 pb-8">
            <Suspense
              fallback={
                <div
                  style={{ borderRadius: '28px', backgroundColor: '#FFFFFF' }}
                  className="w-full h-96 animate-pulse shadow-blue-tint p-6"
                />
              }
            >
              <ActivateAccountCard lang={lang} />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Bottom subtle copyright note */}
      <footer className="w-full max-w-[1400px] mx-auto px-6 py-4 text-center text-xs text-slate-400 select-none z-10 font-sans">
        © {new Date().getFullYear()} Physio Fund Circle. {lang === 'en' ? 'All rights reserved.' : 'Uburenganzira bwose bwubahirijwe.'}
      </footer>
    </div>
  )
}
