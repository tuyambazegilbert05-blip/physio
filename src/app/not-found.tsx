import Link from 'next/link'
import { BrandLogo } from '@/components/ui/BrandLogo'

export default function NotFound() {
  return (
    <main className="app-error">
      <Link href="/" aria-label="Phyaio Cycle home" className="mb-6 inline-flex">
        <BrandLogo size={38} wordmarkClassName="text-xl" />
      </Link>
      <h1>Page not found</h1>
      <p>The page you’re looking for isn’t available.</p>
      <Link href="/dashboard">Return to dashboard</Link>
    </main>
  )
}
