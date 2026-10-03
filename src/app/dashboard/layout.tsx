import type { ReactNode } from 'react'
import { Footer } from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        backgroundColor: '#F8FAFF',
        backgroundImage:
          'linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
      className="flex min-h-screen text-[#081233] font-sans antialiased relative selection:bg-[#2437F5]/20 selection:text-[#2437F5]"
    >
      {/* Background ambient radial glows */}
      <div className="fixed -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-cyan-400/10 via-violet-500/06 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="fixed -bottom-32 -right-32 w-[650px] h-[650px] bg-gradient-to-tl from-purple-500/10 via-indigo-500/06 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col relative z-10">
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md p-3 md:hidden">
          <MobileNav />
        </div>
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </div>
  )
}
