'use client'

import { Search } from 'lucide-react'

export function TableFilters({
  query,
  onQueryChange,
  placeholder = 'Search records',
}: {
  query: string
  onQueryChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="mb-4 block w-full max-w-sm">
      <span className="sr-only">{placeholder}</span>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B3FF2]" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-indigo-100 bg-white/85 py-3 pl-10 pr-4 text-sm font-medium text-[#081233] shadow-[0_8px_22px_-20px_rgba(36,55,245,0.55)] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#7B3FF2]/45 focus:bg-white focus:ring-4 focus:ring-[#7B3FF2]/10"
        />
      </span>
    </label>
  )
}
