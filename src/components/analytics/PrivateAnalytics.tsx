'use client'

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'

function omitInvitationUrls(event: BeforeSendEvent) {
  try {
    const pathname = new URL(event.url, window.location.origin).pathname
    return pathname.startsWith('/invitation/') ? null : event
  } catch {
    // Fail closed so an unexpected event URL cannot transmit a credential.
    return null
  }
}

export function PrivateAnalytics() {
  return <Analytics beforeSend={omitInvitationUrls} />
}
