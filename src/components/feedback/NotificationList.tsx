import { Notification, type NotificationItemData } from './Notification'

export function NotificationList({ items }: { items: NotificationItemData[] }) {
  return <ul className="space-y-3">{items.map((item) => <li key={item.id}><Notification item={item} /></li>)}</ul>
}
