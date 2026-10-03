import { formatMoney } from '@/lib/formatters'

export function FinancialChart({
  values,
  label = 'Monthly financial activity',
}: {
  values: { label: string; value: number }[]
  label?: string
}) {
  const max = Math.max(1, ...values.map((item) => item.value))

  return (
    <figure className="w-full">
      <figcaption className="sr-only">{label}</figcaption>

      {/* Chart Canvas */}
      <div
        className="relative flex h-52 items-end gap-3 sm:gap-4 px-2 pt-6 pb-2"
        role="img"
        aria-label={`${label}: ${values.map((item) => `${item.label} ${item.value}`).join(', ')}`}
      >
        {/* Subtle Horizontal Guide Lines */}
        <div className="pointer-events-none absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between opacity-50">
          <div className="border-b border-dashed border-indigo-100" />
          <div className="border-b border-dashed border-indigo-100" />
          <div className="border-b border-slate-200/80" />
        </div>

        {/* Bars */}
        {values.map((item) => {
          const heightPercent = Math.max(4, Math.round((item.value / max) * 100))
          return (
            <div
              key={item.label}
              className="group relative flex h-full flex-1 flex-col justify-end items-center"
            >
              {/* Tooltip on Hover */}
              <div className="pointer-events-none absolute -top-8 z-20 hidden items-center rounded-lg bg-[#081233] px-2.5 py-1 text-[11px] font-bold text-white shadow-lg group-hover:flex whitespace-nowrap">
                <span>{formatMoney(item.value, 'RWF')}</span>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#081233]" />
              </div>

              {/* Bar Fill */}
              <div className="relative w-full max-w-[42px] flex items-end">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#2437F5] via-[#7B3FF2] to-[#1FB8F0] opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-y-[1.02] group-hover:shadow-[0_0_16px_rgba(31,184,240,0.5)] origin-bottom"
                  style={{ height: `${heightPercent}%` }}
                />
              </div>

              {/* Month Label */}
              <span className="mt-2 text-center text-xs font-semibold text-slate-500 group-hover:text-[#2437F5] transition-colors">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}
