import Link from 'next/link'
export default function SettingsPage() {
  return (
    <section className="mx-auto w-full max-w-[1100px] space-y-6 p-5 sm:space-y-8 sm:p-8">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
          Preferences
        </p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
          Settings
        </h1>
      </header>
      <nav className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/settings/profile"
          className="group rounded-[26px] border border-white bg-white/88 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.48)] transition hover:-translate-y-0.5 hover:border-indigo-100 hover:bg-white hover:shadow-[0_22px_52px_-34px_rgba(83,55,220,0.4)] sm:p-6"
        >
          <h2 className="font-heading text-lg font-extrabold tracking-tight text-[#081233]">
            Profile
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Update your name and contact details.
          </p>
        </Link>
        <Link
          href="/dashboard/settings/security"
          className="group rounded-[26px] border border-white bg-white/88 p-5 shadow-[0_18px_48px_-36px_rgba(36,55,245,0.48)] transition hover:-translate-y-0.5 hover:border-indigo-100 hover:bg-white hover:shadow-[0_22px_52px_-34px_rgba(83,55,220,0.4)] sm:p-6"
        >
          <h2 className="font-heading text-lg font-extrabold tracking-tight text-[#081233]">
            Security
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Change your password and review session security.
          </p>
        </Link>
      </nav>
    </section>
  )
}
