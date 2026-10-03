'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BrandLogo } from '@/components/ui/BrandLogo'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" aria-label="Phyaio Cycle home">
          <BrandLogo size={32} wordmarkClassName="text-base" />
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-dashboard-nav"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          {open ? 'Close menu' : 'Menu'}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-dashboard-nav"
          aria-label="Mobile dashboard"
          className="absolute left-0 right-0 z-30 grid gap-2 border-b bg-white p-4 shadow-md"
        >
          {[
            ['Overview', '/dashboard'],
            ['Members', '/dashboard/members'],
            ['Contributions', '/dashboard/contributions'],
            ['Savings', '/dashboard/savings'],
            ['Loans', '/dashboard/loans'],
            ['Operations', '/dashboard/operations'],
            ['Meetings', '/dashboard/meetings'],
            ['Reports', '/dashboard/reports'],
            ['Audit history', '/dashboard/audit'],
            ['Notifications', '/dashboard/notifications'],
            ['Settings', '/dashboard/settings'],
          ].map(([label, href]) => (
            <Link
              key={href}
              onClick={() => setOpen(false)}
              href={href}
              className="rounded px-2 py-2 text-sm hover:bg-slate-50"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
