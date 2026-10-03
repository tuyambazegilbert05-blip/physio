import type { ReactNode } from 'react'

export function Accordion({ items }: { items: { title: string; content: ReactNode }[] }) {
  return <div className="divide-y divide-slate-200">{items.map((item) => <details key={item.title} className="py-3"><summary className="cursor-pointer font-medium">{item.title}</summary><div className="pt-3 text-sm text-slate-600">{item.content}</div></details>)}</div>
}
