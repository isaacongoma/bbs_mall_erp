import { useMemo, useState } from 'react'
import { __ } from '@/core/i18n'
import { dayjsLocal } from '@/core/datetime'
import { Button, Dialog, ItemListRow, LucideIcon, Spinner } from '@/design-system'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import type { HrmsHoliday } from '../types'

interface HolidaysProps {
  holidays: HrmsHoliday[]
  loading?: boolean
  error?: unknown
}

function formatHolidayDate(date: string): string {
  return dayjsLocal(date).format('ddd, D MMM YYYY')
}

export function Holidays({ holidays, loading = false, error }: HolidaysProps) {
  const [open, setOpen] = useState(false)
  const upcoming = useMemo(
    () => holidays.filter((holiday) => dayjsLocal(holiday.holiday_date).isAfter(dayjsLocal())).slice(0, 5),
    [holidays],
  )

  if (loading && !holidays.length)
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    )
  if (error)
    return (
      <p className="rounded-lg bg-surface-red-2 p-4 text-sm text-ink-red-8" role="alert">
        {__('Unable to load holidays')}
      </p>
    )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink-gray-8">{__('Upcoming Holidays')}</h2>
        {holidays.length > 0 && (
          <Button variant="ghost" onClick={() => setOpen(true)}>
            {__('View All')}
          </Button>
        )}
      </div>
      {upcoming.length ? (
        <div className="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base">
          {upcoming.map((holiday) => (
            <ItemListRow
              key={holiday.holiday_date}
              size="lg"
              className="border-b border-outline-gray-1 last:border-b-0"
            >
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <LucideIcon name="calendar" className="size-5 shrink-0 text-ink-gray-5" />
                  <span className="truncate text-sm text-ink-gray-8">{__(holiday.description ?? '')}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink-gray-8">
                  {formatHolidayDate(holiday.holiday_date)}
                </span>
              </div>
            </ItemListRow>
          ))}
        </div>
      ) : (
        <EmptyState name={__('upcoming holidays')} description={__('You have no upcoming holidays')} />
      )}
      <Dialog open={open} onOpenChange={setOpen} title={__('Holiday List')}>
        <div className="flex max-h-[65vh] flex-col gap-2 overflow-auto">
          {holidays.map((holiday) => (
            <div
              key={holiday.holiday_date}
              className="flex items-center justify-between gap-3 border-b border-outline-gray-1 px-1 py-3 last:border-b-0"
            >
              <span className="text-sm text-ink-gray-8">{__(holiday.description ?? '')}</span>
              <span className="shrink-0 text-sm font-semibold text-ink-gray-8">
                {formatHolidayDate(holiday.holiday_date)}
              </span>
            </div>
          ))}
        </div>
      </Dialog>
    </section>
  )
}
