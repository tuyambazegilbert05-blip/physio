'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  PiggyBank,
  Wallet,
  HandCoins,
  Activity,
  Calendar,
  FileText,
  Sparkles,
  ClipboardList,
} from 'lucide-react'
import { BrandLogo } from '@/components/ui/BrandLogo'

const navigationItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/dashboard/members', icon: Users },
  { label: 'Contributions', href: '/dashboard/contributions', icon: PiggyBank },
  { label: 'Savings', href: '/dashboard/savings', icon: Wallet },
  { label: 'Loans', href: '/dashboard/loans', icon: HandCoins },
  { label: 'Operations', href: '/dashboard/operations', icon: Activity },
  { label: 'Meetings', href: '/dashboard/meetings', icon: Calendar },
  { label: 'Reports', href: '/dashboard/reports', icon: FileText },
  { label: 'Audit history', href: '/dashboard/audit', icon: ClipboardList },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white/95 backdrop-blur-xl md:flex md:flex-col md:justify-between p-5 select-none sticky top-0 h-screen z-20">
      <div>
        {/* Brand Header */}
        <div className="mb-6 px-2">
          <Link href="/dashboard" aria-label="Phyaio Cycle home" className="inline-flex items-center group">
            <BrandLogo size={34} wordmarkClassName="font-heading font-extrabold text-lg text-[#081233]" />
          </Link>
          <div className="mt-2.5 flex items-center gap-1.5 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2DE1B9] animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Savings Workspace
            </span>
          </div>
        </div>

        {/* Section Label */}
        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </p>

        {/* Navigation Links */}
        <nav aria-label="Dashboard" className="space-y-1">
          {navigationItems.map(({ label, href, icon: Icon }) => {
            const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2437F5]/10 via-[#7B3FF2]/08 to-transparent text-[#2437F5] font-bold border-l-4 border-[#2437F5] pl-2.5 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#081233]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#2437F5]' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Trust & Cycle Pill Card */}
      <div className="rounded-2xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-xs text-[#2437F5]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="font-heading text-xs font-bold text-[#081233]">Cycle Active</p>
            <p className="text-[10px] text-slate-500 font-medium">92% on-time records</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
