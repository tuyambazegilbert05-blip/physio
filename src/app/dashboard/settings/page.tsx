import Link from 'next/link'
export default function SettingsPage() {
  return <section className="mx-auto max-w-4xl space-y-5 p-6"><h1 className="text-2xl font-semibold">Settings</h1><nav className="grid gap-3 sm:grid-cols-2"><Link href="/dashboard/settings/profile" className="rounded-xl border bg-white p-5 hover:border-indigo-300"><h2 className="font-semibold">Profile</h2><p className="mt-1 text-sm text-slate-600">Update your name and contact details.</p></Link><Link href="/dashboard/settings/security" className="rounded-xl border bg-white p-5 hover:border-indigo-300"><h2 className="font-semibold">Security</h2><p className="mt-1 text-sm text-slate-600">Change your password and review session security.</p></Link></nav></section>
}
