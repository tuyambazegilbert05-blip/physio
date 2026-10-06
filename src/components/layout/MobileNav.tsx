'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { useDashboardNavigation } from '@/components/layout/useDashboardNavigation'
import { WorkspaceControls } from '@/components/layout/WorkspaceControls'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const navigation = useDashboardNavigation()
  const { sections } = navigation

  return (
    <div className="relative md:hidden">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <Link href="/dashboard" aria-label="Physio Fund Circle home" onClick={() => setOpen(false)}>
          <BrandLogo
            size={34}
            wordmarkClassName="font-heading text-base font-extrabold text-[#081233]"
          />
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-dashboard-nav"
          aria-label={open ? 'Close dashboard menu' : 'Open dashboard menu'}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3.5 py-2 text-xs font-bold text-[#2437F5] shadow-[0_6px_16px_-12px_rgba(36,55,245,0.8)] transition hover:border-[#7B3FF2]/35 hover:bg-indigo-50/60"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-dashboard-nav"
          aria-label="Mobile dashboard"
          className="absolute left-0 right-0 top-[calc(100%+12px)] z-50 grid max-h-[calc(100dvh-88px)] gap-1.5 overflow-y-auto rounded-[24px] border border-indigo-100/80 bg-white/95 p-3 shadow-[0_28px_70px_-28px_rgba(8,18,51,0.35)] backdrop-blur-2xl"
        >
          <div className="mb-1 px-1 pt-1">
            <WorkspaceControls navigation={navigation} onNavigate={() => setOpen(false)} />
          </div>
          {sections.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-3 pb-1 pt-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                {section.label}
              </p>
              {section.links.map(({ label, href, icon: Icon }) => {
                const isActive =
                  href === '/dashboard' ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] text-white shadow-[0_10px_22px_-14px_rgba(83,55,220,0.9)]'
                        : 'text-slate-600 hover:bg-indigo-50/80 hover:text-[#2437F5]'
                    }`}
                  >
                    <Icon
                      className={`h-[17px] w-[17px] ${isActive ? 'text-white' : 'text-slate-400'}`}
                    />
                    {label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      )}
    </div>
  )
}
