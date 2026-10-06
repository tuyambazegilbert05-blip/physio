'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { CycleIndicator } from '@/components/layout/CycleIndicator'
import { useDashboardNavigation } from '@/components/layout/useDashboardNavigation'
import { WorkspaceControls } from '@/components/layout/WorkspaceControls'

export function Sidebar() {
  const pathname = usePathname()
  const navigation = useDashboardNavigation()
  const { sections } = navigation

  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-[276px] shrink-0 flex-col justify-between border-r border-white/80 bg-white/72 p-5 shadow-[12px_0_48px_-36px_rgba(36,55,245,0.32)] backdrop-blur-2xl md:flex">
      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-1">
        <div className="mb-5 rounded-[22px] border border-indigo-100/70 bg-gradient-to-br from-white via-white to-indigo-50/70 p-4 shadow-[0_12px_32px_-24px_rgba(36,55,245,0.3)]">
          <Link
            href="/dashboard"
            aria-label="Phyaio Cycle home"
            className="inline-flex items-center"
          >
            <BrandLogo
              size={38}
              wordmarkClassName="font-heading text-lg font-extrabold text-[#081233]"
            />
          </Link>
        </div>

        <div className="mb-5">
          <WorkspaceControls navigation={navigation} />
        </div>

        <nav aria-label="Dashboard" className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="mb-2 flex items-center justify-between px-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  {section.label}
                </p>
              </div>
              <div className="space-y-1">
                {section.links.map(({ label, href, icon: Icon }) => {
                  const isActive =
                    href === '/dashboard' ? pathname === href : pathname.startsWith(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-2.5 text-[12px] font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] text-white shadow-[0_12px_24px_-12px_rgba(83,55,220,0.9)]'
                          : 'text-slate-600 hover:bg-indigo-50/75 hover:text-[#2437F5]'
                      }`}
                    >
                      <Icon
                        className={`h-[16px] w-[16px] shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#7B3FF2]'
                        }`}
                      />
                      <span className="flex-1">{label}</span>
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <CycleIndicator />
    </aside>
  )
}
