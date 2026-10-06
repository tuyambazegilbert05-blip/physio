'use client'

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl p-5 sm:p-8">
      <section role="alert" className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-rose-700">Group workspace</p>
        <h1 className="mt-1 font-heading text-lg font-extrabold text-[#081233]">The group overview could not be loaded</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Refresh the group data. If access was recently changed, sign in again or ask an authorized group official to confirm your permissions.</p>
        <button type="button" onClick={reset} className="mt-4 rounded-lg bg-[#2437F5] px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-800">Try again</button>
      </section>
    </main>
  )
}
