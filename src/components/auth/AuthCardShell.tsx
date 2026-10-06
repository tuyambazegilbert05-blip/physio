'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { LanguageSwitch } from '@/components/auth/LanguageSwitch'

type AuthCardShellProps = {
  children: React.ReactNode
}

export function AuthCardShell({ children }: AuthCardShellProps) {
  const [lang, setLang] = useState<'en' | 'rw'>('en')

  return (
    <div className="min-h-screen w-full flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <BrandLogo size={36} wordmarkClassName="font-heading font-extrabold text-2xl text-[#081233]" />
        </Link>
        <LanguageSwitch currentLang={lang} onToggle={setLang} />
      </header>

      {/* Main Centered Card Container */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-[440px] mx-auto">
        <div className="w-full bg-white rounded-[26px] p-7 sm:p-10 shadow-blue-tint border border-slate-100">
          {children}
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-slate-500 select-none">
          <ShieldCheck className="w-4 h-4 text-[#2DE1B9]" />
          <span className="font-sans font-medium">
            {lang === 'en'
              ? 'Secure group savings management'
              : 'Umutekano wizewe mu micungire ya Physio Fund Cycle'}
          </span>
        </div>
      </main>

      {/* Bottom spacer */}
      <footer className="py-2 text-center text-xs text-slate-400 font-sans">
        © {new Date().getFullYear()} Physio Fund Cycle. All rights reserved.
      </footer>
    </div>
  )
}
