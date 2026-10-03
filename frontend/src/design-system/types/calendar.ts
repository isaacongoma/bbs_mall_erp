import type { Dayjs } from '@/core/datetime'

export interface DateCell {
  date: Dayjs
  key: string
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
}

export interface CalendarCell extends DateCell {
  isUnavailable: boolean
  isRangeStart?: boolean
  isRangeEnd?: boolean
  inRange?: boolean
}
