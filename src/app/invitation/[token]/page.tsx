import type { Metadata } from 'next'
import { InvitationPage } from '@/features/membership/components/InvitationPage'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Ikimina invitation',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function InvitationRoute({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const [{ token }, query] = await Promise.all([params, searchParams])
  return <InvitationPage token={token} declineRequested={query.action === 'decline'} />
}
