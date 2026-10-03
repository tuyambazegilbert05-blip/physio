import Link from 'next/link'

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index > 0 && <span aria-hidden="true">/</span>}{item.href ? <Link href={item.href} className="hover:text-indigo-700">{item.label}</Link> : <span aria-current="page" className="text-slate-900">{item.label}</span>}</li>)}</ol></nav>
}
