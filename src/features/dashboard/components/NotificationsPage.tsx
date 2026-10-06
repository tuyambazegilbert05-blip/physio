'use client'

import { useEffect, useState } from 'react'
import { useActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import { NotificationList } from '@/features/notifications/components/NotificationList'
import { notificationService } from '@/features/notifications/services/notification.service'
import type { NotificationRecord } from '@/types/notification'

export function NotificationsPage() {
  const { loading } = useActiveGroup()
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!loading)
      notificationService
        .list()
        .then(setItems)
        .catch((reason: unknown) =>
          setError(reason instanceof Error ? reason.message : 'Unable to load notifications.'),
        )
  }, [loading])
  if (loading) return <p className="p-8">Loading…</p>
  return (
    <section className="mx-auto w-full max-w-[1100px] space-y-6 p-5 sm:space-y-8 sm:p-8">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
          Group updates
        </p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
          Notifications
        </h1>
      </header>
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : (
        <NotificationList
          items={items.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            href: item.href ?? undefined,
            read: Boolean(item.read_at),
            createdAt: item.created_at,
          }))}
        />
      )}
    </section>
  )
}
