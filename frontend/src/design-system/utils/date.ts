import { dayjs, dayjsLocal, type Dayjs } from '@/core/datetime'
import type { DateCell } from '../types/calendar'

export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const DATE_FORMAT = 'YYYY-MM-DD'
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

export function monthStart(year: number, monthIndex: number): Dayjs {
  return dayjs(`${year}-${monthIndex + 1}-01`)
}

export function generateWeeks(year: number, monthIndex: number, selected: string): DateCell[][] {
  const start = monthStart(year, monthIndex).startOf('week')
  const days: DateCell[] = []
  let current = start
  const selectedDate = dayjs(selected)
  const today = dayjsLocal().format(DATE_FORMAT)
  for (let index = 0; index < 42; index++) {
    days.push({
      date: current,
      key: current.format(DATE_FORMAT),
      inMonth: current.month() === monthIndex,
      isToday: current.isSame(today, 'day'),
      isSelected: selectedDate.isValid() && current.isSame(selectedDate, 'day'),
    })
    current = current.add(1, 'day')
  }
  const weeks: DateCell[][] = []
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7))
  return weeks
}

export function getDateValue(date: Date | string): string {
  if (!date || date.toString() === 'Invalid Date') return ''
  return dayjs(date).set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0).format(DATE_FORMAT)
}

export function makeCoercer(format: string | undefined) {
  return (value?: string | null): Dayjs | null => {
    if (!value) return null
    const raw = String(value).trim()
    if (!raw) return null
    if (format) {
      const strict = dayjs(raw, format, true)
      if (strict.isValid()) return strict
    }
    const loose = dayjs(raw)
    if (loose.isValid()) return loose
    const normalized = getDateValue(raw)
    if (normalized) {
      const fromNormalized = dayjs(normalized)
      if (fromNormalized.isValid()) return fromNormalized
    }
    return null
  }
}

export function makeUnavailableCheck(min?: string, max?: string, isUnavailable?: (date: Dayjs) => boolean) {
  return (date: Dayjs): boolean => {
    if (min && date.isBefore(dayjs(min), 'day')) return true
    if (max && date.isAfter(dayjs(max), 'day')) return true
    if (isUnavailable?.(date)) return true
    return false
  }
}

export function formatByPattern(dateText: string, format: string): string {
  const parsed = dayjs(dateText)
  return parsed.isValid() ? parsed.format(format) : dateText
}
