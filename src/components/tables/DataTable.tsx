import type { ReactNode } from 'react'

export type DataColumn<T> = {
  key: keyof T
  label: string
  render?: (row: T) => ReactNode
}

export function DataTable<T extends object>({
  rows,
  columns,
  rowKey,
}: {
  rows: T[]
  columns: DataColumn<T>[]
  rowKey: keyof T
}) {
  return (
    <div className="overflow-x-auto rounded-[22px] border border-indigo-100/80 bg-white/90 shadow-[0_16px_44px_-36px_rgba(36,55,245,0.5)]">
      <table className="w-full min-w-[620px] border-collapse text-left text-[13px]">
        <thead className="bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/65 text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} scope="col" className="whitespace-nowrap px-5 py-4">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-indigo-50/90">
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-5 py-12 text-center text-sm font-medium text-slate-400"
                colSpan={columns.length}
              >
                No records to show.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={String(row[rowKey])} className="transition-colors hover:bg-indigo-50/35">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-5 py-4 text-slate-700">
                    {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
