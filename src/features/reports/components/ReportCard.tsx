import Link from 'next/link'
export function ReportCard({ title, description, href }: { title: string; description: string; href: string }) {
  return <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-600">{description}</p><span className="mt-4 block text-sm font-medium text-indigo-700">Open report →</span></Link>
}
