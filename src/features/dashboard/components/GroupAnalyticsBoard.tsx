'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Clock3,
  Search,
  Users,
} from 'lucide-react'
import { persistActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'

export type GroupFlowPeriod = {
  key: string
  label: string
  contributions: number
  repayments: number
}

export type GroupHealthSignal = {
  key: string
  label: string
  value: number | null
}

export type PaymentMatrixCell = {
  status: 'paid' | 'partially_paid' | 'due' | 'overdue' | 'waived' | 'missing'
  dueOn?: string
}

export type GroupPaymentMatrix = {
  periods: { key: string; label: string }[]
  rows: { id: string; name: string; cells: PaymentMatrixCell[] }[]
}

export type GroupAttentionItem = {
  title: string
  description: string
  href: string
  label: string
}

export type GroupAnalyticsData = {
  groupId: string
  currency: string
  monthName: string
  asOf: string
  balance: number | null
  received: number | null
  expected: number | null
  totalContributions: number | null
  outstandingObligationAmount: number | null
  loansPastDue: number | null
  pendingLoans: number | null
  activeMembers: number | null
  inactiveMembers: number | null
  suspendedMembers: number | null
  pendingRequests: number | null
  unresolvedDecisions: number | null
  outstandingPrincipal: number | null
  outstandingInterest: number | null
  issuedPrincipal: number | null
  issuedOutstandingPrincipal: number | null
  paidObligations: number | null
  partialObligations: number | null
  dueObligations: number | null
  waivedObligations: number | null
  signals: GroupHealthSignal[]
  periods: GroupFlowPeriod[]
  paymentMatrix: GroupPaymentMatrix | null
  canReadContributions: boolean
  canReadRepayments: boolean
  attention: GroupAttentionItem[]
}

const signalColors = ['#8b2cf5', '#17c99a', '#21a7e8', '#f2a900']
const cellStyle: Record<PaymentMatrixCell['status'], { label: string; className: string }> = {
  paid: { label: 'Received', className: 'bg-emerald-400 text-emerald-950' },
  partially_paid: { label: 'Partly paid', className: 'bg-amber-300 text-amber-950' },
  due: { label: 'Due', className: 'bg-rose-200 text-rose-950' },
  overdue: { label: 'Overdue', className: 'bg-rose-400 text-rose-950' },
  waived: { label: 'Waived', className: 'bg-slate-200 text-slate-600' },
  missing: { label: 'No obligation recorded', className: 'bg-slate-50 text-slate-300' },
}

function money(value: number | null, currency: string) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function compactMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function pct(value: number | null) {
  return value === null ? '—' : `${Math.round(value)}%`
}

function GroupPulse({ signals }: { signals: GroupHealthSignal[] }) {
  const visibleSignals = signals.slice(0, 4)
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-violet-100 bg-white/95 p-4 shadow-[0_18px_45px_-38px_rgba(63,32,133,.45)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-violet-700">
            Group intelligence
          </p>
          <h2 className="mt-1 font-heading text-sm font-extrabold text-[#21103e]">
            Operating pulse
          </h2>
        </div>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-800">
          CURRENT
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 sm:gap-4">
        <div className="relative h-[190px] w-[190px] shrink-0 sm:h-[208px] sm:w-[208px]">
          <svg
            viewBox="0 0 220 220"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label="Group health indicators"
          >
            {visibleSignals.map((signal, index) => {
              const radius = 97 - index * 19
              const circumference = 2 * Math.PI * radius
              const value = signal.value === null ? 0 : Math.max(0, Math.min(100, signal.value))
              return (
                <g key={signal.key}>
                  <circle
                    cx="110"
                    cy="110"
                    r={radius}
                    fill="none"
                    stroke="#f0eafa"
                    strokeWidth="7"
                  />
                  <circle
                    cx="110"
                    cy="110"
                    r={radius}
                    fill="none"
                    stroke={signalColors[index]}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference * (1 - value / 100)}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                </g>
              )
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-2xl font-black tracking-tight text-[#251044]">
              {visibleSignals
                .filter((signal) => signal.value !== null)
                .length.toString()
                .padStart(2, '0')}
            </span>
            <span className="mt-0.5 text-[8px] font-extrabold uppercase tracking-[.2em] text-slate-400">
              signals ready
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          {visibleSignals.map((signal, index) => (
            <div key={signal.key} className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: signalColors[index] }}
              />
              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-600">
                {signal.label}
              </span>
              <span className="shrink-0 font-heading text-[11px] font-extrabold text-[#251044]">
                {pct(signal.value)}
              </span>
            </div>
          ))}
          <p className="border-t border-slate-100 pt-2 text-[9px] leading-relaxed text-slate-400">
            Each ring is a separate measure. No combined score is inferred.
          </p>
        </div>
      </div>
    </section>
  )
}

function MiniBars({ values, color = '#8b2cf5' }: { values: number[]; color?: string }) {
  const max = Math.max(1, ...values)
  return (
    <div className="flex h-7 items-end gap-1" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={index}
          className="min-w-0 flex-1 rounded-t-sm opacity-80 transition-opacity group-hover:opacity-100"
          style={{
            height: `${value > 0 ? Math.max(8, (value / max) * 100) : 2}%`,
            backgroundColor: value > 0 ? color : '#ede9f7',
          }}
        />
      ))}
    </div>
  )
}

function SnapshotTile({
  href,
  groupId,
  label,
  value,
  note,
  children,
}: {
  href: string
  groupId: string
  label: string
  value: string
  note: string
  children?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={() => persistActiveGroup(groupId)}
      className="group min-w-0 rounded-[18px] border border-violet-100 bg-white/95 p-3.5 shadow-[0_12px_28px_-25px_rgba(63,32,133,.4)] transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_17px_32px_-23px_rgba(123,63,242,.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:p-4"
      aria-label={`${label}: ${value}. ${note}. Open details.`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[9px] font-bold text-slate-500">{label}</p>
        <ArrowUpRight
          className="h-3.5 w-3.5 shrink-0 text-violet-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
      <p className="mt-1 truncate font-heading text-lg font-black tracking-tight text-[#231044] sm:text-xl">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-slate-500">{note}</p>
      {children && <div className="mt-2.5">{children}</div>}
    </Link>
  )
}

function FlowChart({
  periods,
  currency,
  canReadContributions,
  canReadRepayments,
}: {
  periods: GroupFlowPeriod[]
  currency: string
  canReadContributions: boolean
  canReadRepayments: boolean
}) {
  const [range, setRange] = useState<6 | 12>(6)
  const [showContributions, setShowContributions] = useState(canReadContributions)
  const [showRepayments, setShowRepayments] = useState(canReadRepayments)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const visible = periods.slice(-range)
  const series = [
    {
      key: 'contributions',
      label: 'Verified contributions',
      color: '#8b2cf5',
    },
    { key: 'repayments', label: 'Verified repayments', color: '#11b98a' },
  ] as const
  const displayedValues = visible.flatMap((period) => [
    ...(showContributions ? [period.contributions] : []),
    ...(showRepayments ? [period.repayments] : []),
  ])
  const hasFlows = displayedValues.some((value) => value > 0)
  const max = Math.max(1, ...displayedValues)
  const width = 760
  const height = 178
  const left = 68
  const right = 12
  const top = 12
  const bottom = 27
  const graphWidth = width - left - right
  const graphHeight = height - top - bottom
  const point = (index: number, value: number) => ({
    x: left + (visible.length <= 1 ? graphWidth / 2 : (index / (visible.length - 1)) * graphWidth),
    y: top + graphHeight - (value / max) * graphHeight,
  })
  const createPath = (key: 'contributions' | 'repayments') =>
    visible
      .map((period, index) => {
        const { x, y } = point(index, period[key])
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  const activePeriod = hoveredIndex === null ? visible.at(-1) : visible[hoveredIndex]

  return (
    <section className="rounded-[22px] border border-violet-100 bg-white/95 p-4 shadow-[0_18px_45px_-38px_rgba(63,32,133,.45)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-violet-700">
            Cash movement
          </p>
          <h2 className="mt-1 font-heading text-sm font-extrabold text-[#21103e]">
            Verified inflows
          </h2>
        </div>
        <div
          className="flex rounded-lg border border-slate-100 bg-slate-50 p-0.5"
          role="group"
          aria-label="Chart range"
        >
          {([6, 12] as const).map((months) => (
            <button
              key={months}
              type="button"
              aria-pressed={range === months}
              onClick={() => {
                setRange(months)
                setHoveredIndex(null)
              }}
              className={`rounded-md px-2.5 py-1 text-[9px] font-bold transition ${range === months ? 'bg-white text-violet-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {months}M
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-3">
          {series
            .filter((item) =>
              item.key === 'contributions' ? canReadContributions : canReadRepayments,
            )
            .map((item) => {
              const isVisible = item.key === 'contributions' ? showContributions : showRepayments
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={isVisible}
                  disabled={
                    isVisible &&
                    !(item.key === 'contributions' ? showRepayments : showContributions)
                  }
                  onClick={() =>
                    item.key === 'contributions'
                      ? setShowContributions(!showContributions)
                      : setShowRepayments(!showRepayments)
                  }
                  className={`inline-flex items-center gap-1.5 text-[9px] font-semibold transition disabled:cursor-default ${isVisible ? 'text-slate-600' : 'text-slate-300'}`}
                >
                  <span
                    className="h-1.5 w-3 rounded-full"
                    style={{ backgroundColor: isVisible ? item.color : '#cbd5e1' }}
                  />
                  {item.label}
                </button>
              )
            })}
        </div>
        {activePeriod && (
          <p className="text-[9px] font-semibold text-slate-500">
            {activePeriod.label}
            {showContributions && ` · ${money(activePeriod.contributions, currency)}`}
            {showRepayments && ` · ${money(activePeriod.repayments, currency)} repaid`}
          </p>
        )}
      </div>

      <div className="mt-2 overflow-x-auto">
        <div className="relative h-[178px] min-w-[580px] w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-full w-full overflow-visible"
            role="img"
            aria-label="Monthly verified contributions and loan repayments"
          >
            {[0, 1, 2, 3].map((line) => {
              const y = top + (graphHeight / 3) * line
              const tickValue = max * (1 - line / 3)
              return (
                <g key={line}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y}
                    y2={y}
                    stroke="#eee8f7"
                    strokeDasharray="3 5"
                  />
                  <text
                    x={left - 7}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[8px] font-medium"
                  >
                    {hasFlows ? compactMoney(tickValue, currency) : ''}
                  </text>
                </g>
              )
            })}
            {visible.map((period, index) => {
              const x = point(index, 0).x
              return (
                <g key={period.key}>
                  <rect
                    x={x - Math.max(15, graphWidth / visible.length / 2)}
                    y={top}
                    width={Math.max(30, graphWidth / visible.length)}
                    height={graphHeight}
                    fill="transparent"
                    className="cursor-crosshair focus-visible:fill-violet-100/40 focus-visible:stroke-violet-400 focus-visible:stroke-[1.5px]"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setHoveredIndex(index)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${period.label} ${period.key.slice(0, 4)}: contributions ${money(period.contributions, currency)}, repayments ${money(period.repayments, currency)}`}
                  />
                  <text
                    x={x}
                    y={height - 5}
                    textAnchor="middle"
                    className="fill-slate-400 text-[9px] font-medium"
                  >
                    {period.label.slice(0, 3)}
                  </text>
                </g>
              )
            })}
            {showContributions && (
              <path
                d={createPath('contributions')}
                fill="none"
                stroke="#8b2cf5"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {showRepayments && (
              <path
                d={createPath('repayments')}
                fill="none"
                stroke="#11b98a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {visible.map((period, index) => {
              const active = hoveredIndex === index
              return (
                <g key={`${period.key}-dots`} className="pointer-events-none">
                  {showContributions && (
                    <circle
                      cx={point(index, period.contributions).x}
                      cy={point(index, period.contributions).y}
                      r={active ? 5 : 3}
                      fill="#fff"
                      stroke="#8b2cf5"
                      strokeWidth="2"
                    />
                  )}
                  {showRepayments && (
                    <circle
                      cx={point(index, period.repayments).x}
                      cy={point(index, period.repayments).y}
                      r={active ? 5 : 3}
                      fill="#fff"
                      stroke="#11b98a"
                      strokeWidth="2"
                    />
                  )}
                </g>
              )
            })}
          </svg>
          {!hasFlows && (
            <div className="pointer-events-none absolute inset-x-10 top-1/3 rounded-lg bg-white/85 px-3 py-2 text-center text-[10px] text-slate-500">
              No verified inflows are recorded in this period yet.
            </div>
          )}
        </div>
      </div>
      <p className="sr-only">Values include only verified contribution and repayment records.</p>
    </section>
  )
}

function CollectionRail({ data }: { data: GroupAnalyticsData }) {
  const paid = data.paidObligations ?? 0
  const partial = data.partialObligations ?? 0
  const due = data.dueObligations ?? 0
  const waived = data.waivedObligations ?? 0
  const total = paid + partial + due + waived
  const width = (count: number) => `${total ? (count / total) * 100 : 0}%`
  const parts = [
    { label: 'Paid', count: paid, color: '#12c995' },
    { label: 'Partly paid', count: partial, color: '#24a9e9' },
    { label: 'Due', count: due, color: '#f2a900' },
    { label: 'Waived', count: waived, color: '#a78bfa' },
  ]
  return (
    <div className="rounded-xl border border-violet-100 bg-white/90 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-violet-700">
            Contribution cycle
          </p>
          <h2 className="mt-1 font-heading text-xs font-extrabold text-[#21103e]">
            {data.monthName} obligation status
          </h2>
        </div>
        <p className="text-[9px] text-slate-500">
          {total
            ? `${total} recorded obligation${total === 1 ? '' : 's'}`
            : 'No obligations recorded'}
          {data.expected !== null ? ` · ${money(data.expected, data.currency)} expected` : ''}
          {data.outstandingObligationAmount !== null
            ? ` · ${money(data.outstandingObligationAmount, data.currency)} outstanding`
            : ''}
        </p>
      </div>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={parts.map((part) => `${part.count} ${part.label}`).join(', ')}
      >
        {parts.map(
          (part) =>
            part.count > 0 && (
              <span
                key={part.label}
                className="h-full transition-[width] duration-500"
                style={{ width: width(part.count), backgroundColor: part.color }}
              />
            ),
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((part) => (
          <span
            key={part.label}
            className="inline-flex items-center gap-1 text-[9px] text-slate-500"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: part.color }} />
            {part.label} <strong className="font-bold text-slate-700">{part.count}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function PaymentMatrix({ groupId, matrix }: { groupId: string; matrix: GroupPaymentMatrix }) {
  const [query, setQuery] = useState('')
  const filteredRows = useMemo(
    () => matrix.rows.filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase())),
    [matrix.rows, query],
  )
  return (
    <section className="overflow-hidden rounded-[22px] border border-violet-100 bg-white/95 shadow-[0_18px_45px_-38px_rgba(63,32,133,.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-50 px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-violet-700">
            Member view
          </p>
          <h2 className="mt-1 font-heading text-sm font-extrabold text-[#21103e]">
            Contribution status matrix
          </h2>
        </div>
        <label className="relative block w-full sm:w-48">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find member"
            aria-label="Filter members in contribution matrix"
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-[10px] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
        </label>
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="min-w-[700px] w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#faf8ff]">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-36 bg-[#faf8ff] px-4 py-2 text-[9px] font-extrabold uppercase tracking-wide text-slate-500"
              >
                Member
              </th>
              {matrix.periods.map((period) => (
                <th
                  scope="col"
                  key={period.key}
                  className="min-w-16 px-2 py-2 text-center text-[9px] font-bold text-slate-500"
                >
                  {period.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredRows.map((row) => (
              <tr key={row.id} className="hover:bg-violet-50/40">
                <th
                  scope="row"
                  className="sticky left-0 z-[1] bg-white px-4 py-2 text-left text-[10px] font-semibold text-slate-700"
                >
                  <Link
                    href={`/dashboard/members/${encodeURIComponent(row.id)}?group=${encodeURIComponent(groupId)}`}
                    onClick={() => persistActiveGroup(groupId)}
                    className="inline-flex max-w-40 items-center gap-1 truncate hover:text-violet-800 hover:underline focus-visible:outline-2 focus-visible:outline-violet-600"
                  >
                    <span className="truncate">{row.name}</span>
                    <ArrowUpRight
                      className="h-2.5 w-2.5 shrink-0 text-violet-500"
                      aria-hidden="true"
                    />
                  </Link>
                </th>
                {row.cells.map((cell, index) => {
                  const style = cellStyle[cell.status]
                  const title = `${matrix.periods[index]?.label ?? ''}: ${style.label}${cell.dueOn ? ` · due ${cell.dueOn}` : ''}`
                  return (
                    <td
                      key={`${row.id}-${matrix.periods[index]?.key ?? index}`}
                      className="px-2 py-1.5 text-center"
                    >
                      <span
                        title={title}
                        aria-label={title}
                        className={`inline-flex h-6 w-full max-w-14 items-center justify-center rounded-md text-[9px] font-bold ${style.className}`}
                      >
                        {cell.status === 'paid' ? (
                          <Check className="h-3 w-3" aria-hidden="true" />
                        ) : cell.status === 'missing' ? (
                          '·'
                        ) : (
                          style.label.slice(0, 1)
                        )}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td
                  colSpan={matrix.periods.length + 1}
                  className="px-4 py-8 text-center text-[10px] text-slate-500"
                >
                  {matrix.rows.length
                    ? 'No members match that search.'
                    : 'No active members are available for this view.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-50 px-4 py-2.5 text-[9px] text-slate-500 sm:px-5">
        {(['paid', 'partially_paid', 'due', 'overdue', 'waived', 'missing'] as const).map(
          (status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-sm ${cellStyle[status].className.split(' ')[0]}`} />
              {cellStyle[status].label}
            </span>
          ),
        )}
        <span className="ml-auto">Select a member for their record</span>
      </div>
    </section>
  )
}

function SnapshotTiles({ data }: { data: GroupAnalyticsData }) {
  const recent = data.periods.slice(-6)
  const trend = recent.map((period) => period.contributions)
  const memberTotal =
    (data.activeMembers ?? 0) + (data.inactiveMembers ?? 0) + (data.suspendedMembers ?? 0)
  const issued = data.issuedPrincipal ?? 0
  const principalReturned =
    issued > 0 ? Math.max(0, issued - (data.issuedOutstandingPrincipal ?? 0)) : 0
  const returnedShare = issued > 0 ? Math.min(100, (principalReturned / issued) * 100) : null
  const activeShare = memberTotal > 0 ? ((data.activeMembers ?? 0) / memberTotal) * 100 : 0
  const links = {
    balance: `/dashboard/savings?group=${encodeURIComponent(data.groupId)}`,
    contributions: `/dashboard/contributions?group=${encodeURIComponent(data.groupId)}`,
    loans: `/dashboard/loans?group=${encodeURIComponent(data.groupId)}`,
    members: `/dashboard/members?group=${encodeURIComponent(data.groupId)}`,
    requests: `/dashboard/membership-requests?group=${encodeURIComponent(data.groupId)}`,
    decisions: `/dashboard/meetings?group=${encodeURIComponent(data.groupId)}`,
  }
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {data.balance !== null && (
        <SnapshotTile
          groupId={data.groupId}
          href={links.balance}
          label="Available balance"
          value={money(data.balance, data.currency)}
          note={data.asOf ? `Ledger · ${data.asOf}` : 'Current ledger balance'}
        >
          <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-violet-700">
            <CircleDollarSign className="h-3 w-3" aria-hidden="true" /> Current ledger
          </span>
        </SnapshotTile>
      )}
      {data.received !== null && (
        <SnapshotTile
          groupId={data.groupId}
          href={links.contributions}
          label={`${data.monthName} received`}
          value={money(data.received, data.currency)}
          note={`${data.expected === null ? 'Verified this period' : `${money(data.expected, data.currency)} expected`}${data.totalContributions !== null ? ` · ${money(data.totalContributions, data.currency)} verified total` : ''}`}
        >
          <MiniBars values={trend} />
        </SnapshotTile>
      )}
      {data.outstandingPrincipal !== null && (
        <SnapshotTile
          groupId={data.groupId}
          href={links.loans}
          label="Loan principal out"
          value={money(data.outstandingPrincipal, data.currency)}
          note={`${money(data.outstandingInterest, data.currency)} interest · ${pct(returnedShare)} principal returned · ${data.loansPastDue ?? 0} overdue${data.pendingLoans !== null ? ` · ${data.pendingLoans} pending review` : ''}`}
        >
          <div
            className="h-1.5 overflow-hidden rounded-full bg-violet-100"
            title={`${pct(returnedShare)} principal returned`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-[width] duration-500"
              style={{ width: `${returnedShare ?? 0}%` }}
            />
          </div>
        </SnapshotTile>
      )}
      {data.activeMembers !== null && (
        <SnapshotTile
          groupId={data.groupId}
          href={links.members}
          label="Active members"
          value={String(data.activeMembers)}
          note={
            memberTotal
              ? `${memberTotal} member records · ${pct(activeShare)} active`
              : 'Member totals unavailable'
          }
        >
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-slate-100"
            title={`${data.activeMembers ?? 0} active, ${data.inactiveMembers ?? 0} inactive, ${data.suspendedMembers ?? 0} suspended`}
          >
            {(data.activeMembers ?? 0) > 0 && (
              <span className="bg-emerald-400" style={{ width: `${activeShare}%` }} />
            )}
            {(data.inactiveMembers ?? 0) > 0 && (
              <span
                className="bg-amber-300"
                style={{
                  width: `${memberTotal ? ((data.inactiveMembers ?? 0) / memberTotal) * 100 : 0}%`,
                }}
              />
            )}
            {(data.suspendedMembers ?? 0) > 0 && (
              <span
                className="bg-rose-400"
                style={{
                  width: `${memberTotal ? ((data.suspendedMembers ?? 0) / memberTotal) * 100 : 0}%`,
                }}
              />
            )}
          </div>
        </SnapshotTile>
      )}
      {data.pendingRequests !== null && (
        <SnapshotTile
          groupId={data.groupId}
          href={links.requests}
          label="Join requests"
          value={String(data.pendingRequests)}
          note="Awaiting authorized review"
        />
      )}
      {data.unresolvedDecisions !== null && (
        <SnapshotTile
          groupId={data.groupId}
          href={links.decisions}
          label="Open decisions"
          value={String(data.unresolvedDecisions)}
          note="No recorded outcome yet"
        />
      )}
    </div>
  )
}

export function GroupAnalyticsBoard({ data }: { data: GroupAnalyticsData }) {
  const attention = data.attention
  return (
    <div className="space-y-3.5">
      <div className="grid gap-3 xl:grid-cols-[minmax(300px,.86fr)_minmax(0,1.5fr)]">
        <GroupPulse signals={data.signals} />
        <SnapshotTiles data={data} />
      </div>
      {data.paidObligations !== null && <CollectionRail data={data} />}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,.75fr)]">
        {data.canReadContributions || data.canReadRepayments ? (
          <FlowChart
            periods={data.periods}
            currency={data.currency}
            canReadContributions={data.canReadContributions}
            canReadRepayments={data.canReadRepayments}
          />
        ) : (
          <section className="flex min-h-52 items-center justify-center rounded-[22px] border border-violet-100 bg-white/95 p-5 text-center text-xs text-slate-500">
            Inflow trends are not available under your assigned permissions.
          </section>
        )}
        <section className="rounded-[22px] border border-violet-100 bg-white/95 p-4 shadow-[0_18px_45px_-38px_rgba(63,32,133,.45)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-violet-700">
                Action queue
              </p>
              <h2 className="mt-1 font-heading text-sm font-extrabold text-[#21103e]">
                Needs your decision
              </h2>
            </div>
            <Clock3 className="h-4 w-4 text-violet-600" aria-hidden="true" />
          </div>
          <div className="mt-3 space-y-2">
            {attention.length ? (
              attention.slice(0, 4).map((item) => (
                <Link
                  key={`${item.href}-${item.title}`}
                  href={item.href}
                  onClick={() => persistActiveGroup(data.groupId)}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-violet-200 hover:bg-violet-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-bold text-slate-800">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] text-slate-500">
                      {item.description}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[8px] font-bold text-violet-800">
                    {item.label}
                  </span>
                  <ArrowRight
                    className="h-3 w-3 shrink-0 text-violet-500 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ))
            ) : (
              <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 text-center">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <p className="mt-1 text-[10px] font-bold text-emerald-900">No pending action</p>
                <p className="mt-0.5 text-[9px] text-emerald-800/70">
                  Your permission-scoped queue is clear.
                </p>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-violet-50/75 px-3 py-2 text-[9px] text-violet-900">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Actions are scoped to <strong className="font-extrabold">this Ikimina</strong> and
              your assigned permissions.
            </span>
          </div>
        </section>
      </div>
      {data.paymentMatrix && <PaymentMatrix groupId={data.groupId} matrix={data.paymentMatrix} />}
    </div>
  )
}
