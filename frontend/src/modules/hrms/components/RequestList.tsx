import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Badge, ItemListRow, LucideIcon, Spinner } from '@/design-system'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import type { HrmsRequest } from '../types'
import { formatDateRange, formatShiftDates } from '../utils/formatters'
import { RequestDetailDialog } from './RequestDetailDialog'

interface RequestListProps {
  items: HrmsRequest[]
  loading?: boolean
  error?: unknown
  kind: 'attendance' | 'leave' | 'shift' | 'expense'
  emptyName: string
  onChanged?: () => void
}

const icons = {
  attendance: 'calendar-check',
  leave: 'calendar-off',
  shift: 'briefcase-business',
  expense: 'receipt',
} as const

const themes = {
  Draft: 'gray',
  Submitted: 'blue',
  Open: 'amber',
  Approved: 'green',
  Rejected: 'red',
  Cancelled: 'gray',
} as const

function getStatus(item: HrmsRequest): keyof typeof themes {
  if (item.status && item.status in themes) return item.status as keyof typeof themes
  if (item.workflow_state && item.workflow_state in themes) return item.workflow_state as keyof typeof themes
  return item.docstatus ? 'Submitted' : 'Draft'
}

function getDates(item: HrmsRequest, kind: RequestListProps['kind']): string {
  if (kind === 'leave') return item.leave_dates ?? formatDateRange(item)
  if (kind === 'shift') return item.shift_dates ?? formatShiftDates(item)
  if (kind === 'expense') return item.posting_date ?? ''
  return item.attendance_dates ?? formatDateRange(item)
}

function getKind(item: HrmsRequest, fallback: RequestListProps['kind']): RequestListProps['kind'] {
  if (item.doctype === 'Attendance Request') return 'attendance'
  if (item.doctype === 'Shift Request' || item.doctype === 'Shift Assignment') return 'shift'
  if (item.doctype === 'Expense Claim') return 'expense'
  if (item.doctype === 'Leave Application') return 'leave'
  return fallback
}

export function RequestList({ items, loading = false, error, kind, emptyName, onChanged }: RequestListProps) {
  const [selected, setSelected] = useState<HrmsRequest | null>(null)
  if (loading && !items.length) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg bg-surface-red-2 p-4 text-sm text-ink-red-8" role="alert">
        {__('Unable to load {0}', [emptyName])}
      </p>
    )
  }

  if (!items.length)
    return (
      <div className="min-h-40 rounded-xl border border-outline-gray-2 bg-surface-base">
        <EmptyState name={emptyName} description={__('There are no recent {0}.', [emptyName.toLowerCase()])} />
      </div>
    )

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base">
        {items.map((item) => {
          const status = getStatus(item)
          const itemKind = getKind(item, kind)
          return (
            <ItemListRow
              key={item.name}
              size="lg"
              className="cursor-pointer border-b border-outline-gray-1 last:border-b-0"
              onClick={() => setSelected(item)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <LucideIcon name={icons[itemKind]} className="size-5 shrink-0 text-ink-gray-5" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-ink-gray-8">
                    {item.reason || item.leave_type || item.shift_type || item.name}
                  </p>
                  <p className="mt-1 text-xs text-ink-gray-5">{getDates(item, itemKind)}</p>
                </div>
                <Badge theme={themes[status]} variant="outline" label={__(status)} />
              </div>
            </ItemListRow>
          )
        })}
      </div>
      <RequestDetailDialog request={selected} onClose={() => setSelected(null)} onChanged={onChanged} />
    </>
  )
}
