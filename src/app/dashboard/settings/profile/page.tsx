import { ProfileSettingsForm } from '@/features/users/components/ProfileSettingsForm'

export default function ProfileSettingsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7B3FF2]">
          Preferences
        </p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-[#081233] sm:text-3xl">
          Profile settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Keep the contact information on your account up to date.
        </p>
      </header>
      <section className="rounded-[28px] border border-white/90 bg-white/88 p-5 shadow-[0_20px_56px_-40px_rgba(36,55,245,0.55)] backdrop-blur-xl sm:p-7">
        <ProfileSettingsForm />
      </section>
    </main>
  )
}
