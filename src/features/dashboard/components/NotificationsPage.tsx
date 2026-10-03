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
  useEffect(() => { if (!loading) notificationService.list().then(setItems).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load notifications.')) }, [loading])
  if (loading) return <p className="p-8">Loading…</p>
  return <section className="mx-auto max-w-4xl space-y-5 p-6"><h1 className="text-2xl font-semibold">Notifications</h1>{error ? <p role="alert" className="text-red-700">{error}</p> : <NotificationList items={items.map((item) => ({ id: item.id, title: item.title, body: item.body, href: item.href ?? undefined, read: Boolean(item.read_at), createdAt: item.created_at }))} />}</section>
}
