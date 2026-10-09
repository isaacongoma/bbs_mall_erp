import { useMemo, useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Spinner } from '@/design-system'
import { dayjsLocal } from '@/core/datetime'
import { useAttendanceCalendar } from '../stores/attendanceStore'

const statuses = ['Present', 'Half Day', 'Absent', 'On Leave'] as const
const colors: Record<string, string> = {
  Present: 'bg-surface-green-4',
  'Work From Home': 'bg-surface-green-4',
  'Half Day': 'bg-surface-amber-4',
  Absent: 'bg-surface-red-4',
  'On Leave': 'bg-surface-blue-4',
  Holiday: 'bg-surface-gray-4',
}

export function AttendanceCalendar() {
  const [month, setMonth] = useState(dayjsLocal().format('YYYY-MM'))
  const { resource, events } = useAttendanceCalendar(month)
  const first = dayjsLocal(`${month}-01`)
  const days = first.daysInMonth()
  const leading = first.day()
  const summary = useMemo(() => {
    const result: Record<string, number> = {}
    Object.values(events).forEach((status) => {
      const key = status === 'Work From Home' ? 'Present' : status
      result[key] = (result[key] ?? 0) + 1
    })
    return result
  }, [events])

  const shiftMonth = (amount: number) => setMonth(first.add(amount, 'month').format('YYYY-MM'))

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-ink-gray-8">{__('Attendance Calendar')}</h2>
      <div className="rounded-xl border border-outline-gray-2 bg-surface-base p-4 sm:p-6">
        {resource.loading && !resource.data ? (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : resource.error ? (
          <p className="rounded-lg bg-surface-red-2 p-4 text-sm text-ink-red-8" role="alert">
            {__('Unable to load attendance calendar')}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Button
                icon="chevron-left"
                variant="ghost"
                aria-label={__('Previous month')}
                onClick={() => shiftMonth(-1)}
              />
              <h3 className="text-lg font-semibold text-ink-gray-8">{first.format('MMMM YYYY')}</h3>
              <Button
                icon="chevron-right"
                variant="ghost"
                aria-label={__('Next month')}
                onClick={() => shiftMonth(1)}
              />
            </div>
            <div className="mt-6 grid grid-cols-7 gap-y-3 text-center">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                <span key={day} className="text-xs font-medium text-ink-gray-5">
                  {__(day).slice(0, 1)}
                </span>
              ))}
              {Array.from({ length: leading }).map((_, index) => (
                <span key={`leading-${index}`} aria-hidden="true" />
              ))}
              {Array.from({ length: days }, (_, index) => {
                const day = index + 1
                const date = first.date(day).format('YYYY-MM-DD')
                const status = events[date]
                return (
                  <div key={date} className="flex justify-center">
                    <span
                      className={`flex size-8 items-center justify-center rounded-full text-sm text-ink-gray-8 ${status ? (colors[status] ?? 'bg-surface-gray-3') : ''}`}
                    >
                      {day}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-outline-gray-2 pt-5 sm:grid-cols-4">
              {statuses.map((status) => (
                <div key={status} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-ink-gray-6">
                    <span className={`size-3 rounded-full ${colors[status]}`} />
                    <span>{__(status)}</span>
                  </div>
                  <span className="text-center text-base font-semibold text-ink-gray-8">{summary[status] ?? 0}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
