import type { ReactNode } from 'react'

export type DataColumn<T> = { key: keyof T; label: string; render?: (row: T) => ReactNode }

export function DataTable<T extends object>({ rows, columns, rowKey }: { rows: T[]; columns: DataColumn<T>[]; rowKey: keyof T }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column) => <th key={String(column.key)} scope="col" className="px-4 py-3">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>No records to show.</td></tr> : rows.map((row) => <tr key={String(row[rowKey])}>{columns.map((column) => <td key={String(column.key)} className="px-4 py-3 text-slate-700">{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>
}
