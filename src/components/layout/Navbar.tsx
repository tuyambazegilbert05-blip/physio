import Link from 'next/link'
import { BrandLogo } from '@/components/ui/BrandLogo'

export function Navbar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <Link href="/dashboard" aria-label="Physio Fund Cycle home">
        <BrandLogo size={34} wordmarkClassName="text-lg" />
      </Link>
      <nav aria-label="Main">
        <Link href="/dashboard" className="text-sm text-slate-600 hover:text-indigo-700">
          Dashboard
        </Link>
      </nav>
    </header>
  )
}
