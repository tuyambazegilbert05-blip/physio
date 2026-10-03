export function DashboardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/85 px-6 py-4 backdrop-blur-md">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-[#081233] leading-snug">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500 font-sans">
            {description}
          </p>
        )}
      </div>
    </header>
  )
}
