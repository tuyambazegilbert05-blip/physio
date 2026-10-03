'use client'

type Cell = string | number | null

function csvCell(value: Cell) {
  const text = String(value ?? '')
  const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function ReportActions({ fileName, headers, rows }: { fileName: string; headers: string[]; rows: Cell[][] }) {
  function downloadCsv() {
    const contents = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${contents}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <div className="report-actions flex flex-wrap gap-2 print:hidden"><button type="button" onClick={downloadCsv} disabled={!rows.length} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Download CSV</button><button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Print / Save PDF</button></div>
}
