import Link from 'next/link'

export type NotificationItemData = { id: string; title: string; body: string; href?: string; createdAt: string; read: boolean }

export function Notification({ item }: { item: NotificationItemData }) {
  const content = <div className={`rounded-lg border p-4 ${item.read ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50'}`}><p className="font-medium text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.body}</p><time dateTime={item.createdAt} className="mt-2 block text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></div>
  return item.href ? <Link href={item.href} className="block">{content}</Link> : content
}
