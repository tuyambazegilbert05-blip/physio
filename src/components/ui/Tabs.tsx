'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

export function Tabs({ items }: { items: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0)
  const selected = items[active]
  return <div><div role="tablist" className="flex gap-1 border-b border-slate-200">{items.map((item, index) => <button key={item.label} role="tab" aria-selected={index === active} onClick={() => setActive(index)} className={`px-3 py-2 text-sm ${index === active ? 'border-b-2 border-indigo-600 font-semibold text-indigo-700' : 'text-slate-600'}`}>{item.label}</button>)}</div><section role="tabpanel" className="py-4">{selected?.content}</section></div>
}
