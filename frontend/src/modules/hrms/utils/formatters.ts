import { dayjs } from '@/core/datetime'
import { __ } from '@/core/i18n'

interface DateRange {
  from_date?: string | null
  to_date?: string | null
}

interface ShiftRange {
  start_date?: string | null
  end_date?: string | null
}

export function formatDateRange(value: DateRange): string {
  const fromDate = value.from_date ? dayjs(value.from_date).format('D MMM') : ''
  const toDate = value.to_date ? dayjs(value.to_date).format('D MMM') : __('Ongoing')
  return fromDate === toDate ? fromDate : `${fromDate} - ${toDate}`
}

export function totalDateRangeDays(value: DateRange): number | null {
  if (!value.to_date || !value.from_date) return null
  return dayjs(value.to_date).diff(dayjs(value.from_date), 'day') + 1
}

export function formatShiftDates(value: ShiftRange): string {
  const startDate = value.start_date ? dayjs(value.start_date).format('D MMM') : ''
  const endDate = value.end_date ? dayjs(value.end_date).format('D MMM') : __('Ongoing')
  return startDate === endDate ? startDate : `${startDate} - ${endDate}`
}

export function totalShiftDays(value: ShiftRange): number | null {
  if (!value.end_date || !value.start_date) return null
  return dayjs(value.end_date).diff(dayjs(value.start_date), 'day') + 1
}

export function formatShiftTiming(startTime: string, endTime: string): string {
  return `${startTime.split(':').slice(0, 2).join(':')} - ${endTime.split(':').slice(0, 2).join(':')}`
}
