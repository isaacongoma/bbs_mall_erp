import { cn } from '@/design-system'
import { LayoutHeader } from './LayoutHeader'

export function Shimmer({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('shimmer rounded-sm', className)} />
}

export function StatShimmerRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-sm border border-outline-gray-2 bg-surface-base px-5 py-4">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="mt-3 h-7 w-32" />
        </div>
      ))}
    </div>
  )
}

export function TableShimmer({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-sm border border-outline-gray-2 bg-surface-base">
      <div className="flex gap-4 border-b border-outline-gray-2 px-4 py-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Shimmer key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-4 border-b border-outline-gray-2 px-4 py-3 last:border-b-0">
          {Array.from({ length: 6 }, (_, index) => (
            <Shimmer key={index} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ReportShimmer() {
  return (
    <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <StatShimmerRow />
      <TableShimmer />
    </div>
  )
}

export function PagePending() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        className="h-12"
        left={<Shimmer className="h-5 w-48" />}
        right={<Shimmer className="h-7 w-24" />}
      />
      <ReportShimmer />
    </main>
  )
}
