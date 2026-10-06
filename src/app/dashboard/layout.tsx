import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Footer } from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { getCurrentApplicationUser } from '@/lib/security/application-session'

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentApplicationUser()
  if (!user) redirect('/login?next=/dashboard')
  if (!user.email_confirmed_at) redirect(`/verify-email?email=${encodeURIComponent(user.email)}`)

  return (
    <div
      style={{
        backgroundColor: '#F8FAFF',
        backgroundImage:
          'linear-gradient(to right, rgba(99, 102, 241, 0.085) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.085) 1px, transparent 1px)',
        backgroundSize: '42px 42px',
      }}
      className="relative flex min-h-screen text-[#081233] font-sans antialiased selection:bg-[#2437F5]/20 selection:text-[#2437F5]"
    >
      <div className="pointer-events-none fixed -left-48 -top-48 h-[620px] w-[620px] rounded-full bg-gradient-to-br from-cyan-400/10 via-violet-500/10 to-transparent blur-[140px]" />
      <div className="pointer-events-none fixed -bottom-52 -right-40 h-[680px] w-[680px] rounded-full bg-gradient-to-tl from-purple-500/10 via-indigo-500/10 to-transparent blur-[150px]" />

      <Sidebar />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 border-b border-white/70 bg-[#F8FAFF]/85 p-3 backdrop-blur-2xl md:hidden">
          <MobileNav />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
        <Footer />
      </div>
    </div>
  )
}
