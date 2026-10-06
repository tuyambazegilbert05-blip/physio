export default function WorkspaceLoading() {
  return (
    <main aria-label="Loading group operations" className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-7 lg:p-8">
      <div className="h-16 animate-pulse rounded-2xl bg-white/80" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-indigo-100 bg-white/80" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl border border-indigo-100 bg-white/80" />)}
      </div>
    </main>
  )
}
