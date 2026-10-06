'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  CircleUserRound,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { authService } from '@/features/auth/services/auth.service'
import { useAuth } from '@/features/auth/hooks/useAuth'

const profileLinks = [
  { label: 'Account', href: '/dashboard/settings/security', icon: CircleUserRound },
  { label: 'Profile', href: '/dashboard/settings/profile', icon: UserRound },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Members', href: '/dashboard/members', icon: UsersRound },
]

export function DashboardHeader({ title, description }: { title: string; description?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const displayName =
    (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    user?.email?.split('@')[0] ||
    'My account'
  const initials =
    displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'A'

  useEffect(() => {
    if (!menuOpen) return

    function closeWhenOutside(event: MouseEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', closeWhenOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeWhenOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  async function logOut() {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await authService.logout()
      router.replace('/login')
      router.refresh()
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : 'Unable to sign out right now.')
      setLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-[69px] z-30 border-b border-indigo-100/70 bg-white/80 px-4 py-2.5 backdrop-blur-2xl md:top-0 sm:px-6">
      <div className="mx-auto flex min-h-10 max-w-[1500px] items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="hidden text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#7B3FF2] sm:block">
            Phyaio Cycle workspace
          </p>
          <h1 className="truncate font-heading text-base font-extrabold leading-tight tracking-tight text-[#081233] sm:text-lg">
            {title}
          </h1>
          {description && (
            <p className="hidden truncate text-[11px] font-medium text-slate-500 sm:block">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-[10px] font-bold text-emerald-700 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Shared ledger
          </div>
          <Link
            href="/dashboard/notifications"
            aria-label="Open notifications"
            title="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-[#5A36E8] shadow-sm transition hover:border-violet-200 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B3FF2]"
          >
            <Bell className="h-4 w-4" />
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="dashboard-profile-menu"
              aria-label={`Open profile menu for ${displayName}`}
              onClick={() => {
                setMenuOpen((open) => !open)
                setLogoutError('')
              }}
              className="flex max-w-[190px] items-center gap-2 rounded-full border border-indigo-100 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B3FF2] sm:max-w-[230px] sm:pl-1.5 sm:pr-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2437F5] to-[#7B3FF2] text-[10px] font-extrabold text-white">
                {initials}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-[11px] font-extrabold leading-tight text-[#081233]">
                  {displayName}
                </span>
                <span className="block max-w-36 truncate text-[9px] font-medium text-slate-400">
                  {user?.email ?? 'Account options'}
                </span>
              </span>
              <ChevronDown
                className={`hidden h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <nav
              id="dashboard-profile-menu"
              aria-label="Profile options"
              hidden={!menuOpen}
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-[22px] border border-indigo-100/80 bg-white/95 p-2 shadow-[0_24px_64px_-24px_rgba(8,18,51,0.32)] backdrop-blur-2xl"
            >
              <div className="border-b border-indigo-50 px-3 py-2.5">
                <p className="truncate text-xs font-extrabold text-[#081233]">{displayName}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {user?.email ?? 'Manage your account'}
                </p>
              </div>
              <div className="py-1.5">
                {profileLinks.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-indigo-50/80 hover:text-[#4d42cf] focus-visible:bg-indigo-50 focus-visible:outline-none"
                  >
                    <Icon className="h-4 w-4 text-[#7B3FF2]" />
                    {label}
                  </Link>
                ))}
              </div>
              {logoutError && (
                <p
                  role="alert"
                  className="mx-2 mb-2 rounded-xl bg-rose-50 px-3 py-2 text-[10px] text-rose-700"
                >
                  {logoutError}
                </p>
              )}
              <div className="border-t border-indigo-50 pt-1.5">
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => void logOut()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? 'Signing out…' : 'Log out'}
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
