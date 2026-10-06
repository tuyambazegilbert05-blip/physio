'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/ui/BrandLogo'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main role="alert" className="app-error">
      <Link href="/" aria-label="Physio Fund Circle home" className="mb-6 inline-flex">
        <BrandLogo size={38} wordmarkClassName="text-xl" />
      </Link>
      <h1>We couldn’t load this page</h1>
      <p>Your group records are safe. Try loading the page again.</p>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  )
}
