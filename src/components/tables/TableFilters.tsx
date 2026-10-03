'use client'

export function TableFilters({ query, onQueryChange, placeholder = 'Search records' }: { query: string; onQueryChange: (value: string) => void; placeholder?: string }) {
  return <label className="mb-3 block"><span className="sr-only">{placeholder}</span><input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
}
