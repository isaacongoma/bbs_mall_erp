import { useState } from 'react'
import { formatCompact, formatMoney, monthLabel } from '../utils/format'

interface Point {
  month: string
  billed: number
  paid: number
}

export function BillingChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 640
  const height = 220
  const padding = { top: 16, right: 8, bottom: 28, left: 8 }
  const max = Math.max(1, ...data.flatMap((point) => [point.billed, point.paid]))
  const slot = (width - padding.left - padding.right) / Math.max(1, data.length)
  const barWidth = Math.min(16, slot / 3)
  const scale = (value: number) => ((height - padding.top - padding.bottom) * value) / max
  const active = hover === null ? null : data[hover]

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Billed and paid by month"
      >
        {[0.25, 0.5, 0.75, 1].map((step) => (
          <line
            key={step}
            x1={padding.left}
            x2={width - padding.right}
            y1={height - padding.bottom - (height - padding.top - padding.bottom) * step}
            y2={height - padding.bottom - (height - padding.top - padding.bottom) * step}
            className="stroke-outline-gray-2"
            strokeDasharray="3 4"
          />
        ))}
        {data.map((point, index) => {
          const x = padding.left + slot * index + slot / 2
          const billed = scale(point.billed)
          const paid = scale(point.paid)
          return (
            <g key={point.month} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
              <rect x={x - slot / 2} y={0} width={slot} height={height} fill="transparent" />
              <rect
                x={x - barWidth - 1}
                y={height - padding.bottom - billed}
                width={barWidth}
                height={Math.max(billed, 1)}
                rx={4}
                className={hover === index ? 'fill-[#d4a017]' : 'fill-[#e8cf8e]'}
              />
              <rect
                x={x + 1}
                y={height - padding.bottom - paid}
                width={barWidth}
                height={Math.max(paid, 1)}
                rx={4}
                className={hover === index ? 'fill-[#15803d]' : 'fill-[#16a34a]'}
              />
              <text x={x} y={height - 8} textAnchor="middle" className="fill-ink-gray-5 text-[11px]">
                {monthLabel(point.month)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-ink-gray-6">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#e8cf8e]" />
          Billed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#16a34a]" />
          Paid
        </span>
        <span className="ml-auto text-ink-gray-5">Peak {formatCompact(max)}</span>
      </div>
      {active && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-xl border border-outline-gray-2 bg-surface-base px-3 py-2 text-xs shadow-lg">
          <p className="font-semibold text-ink-gray-9">{monthLabel(active.month)}</p>
          <p className="text-ink-gray-6">Billed {formatMoney(active.billed)}</p>
          <p className="text-[#15803d]">Paid {formatMoney(active.paid)}</p>
        </div>
      )}
    </div>
  )
}
