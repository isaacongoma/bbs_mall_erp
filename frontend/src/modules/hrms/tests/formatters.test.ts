import { describe, expect, it } from 'vitest'
import {
  formatDateRange,
  formatShiftDates,
  formatShiftTiming,
  totalDateRangeDays,
  totalShiftDays,
} from '../utils/formatters'

describe('HRMS formatters', () => {
  it('formats bounded and ongoing date ranges', () => {
    expect(formatDateRange({ from_date: '2026-01-01', to_date: '2026-01-01' })).toBe('1 Jan')
    expect(formatDateRange({ from_date: '2026-01-01', to_date: null })).toBe('1 Jan - Ongoing')
    expect(totalDateRangeDays({ from_date: '2026-01-01', to_date: '2026-01-03' })).toBe(3)
  })

  it('formats shift ranges and times', () => {
    expect(formatShiftDates({ start_date: '2026-01-01', end_date: '2026-01-03' })).toBe('1 Jan - 3 Jan')
    expect(totalShiftDays({ start_date: '2026-01-01', end_date: '2026-01-03' })).toBe(3)
    expect(formatShiftTiming('08:30:00', '17:00:00')).toBe('08:30 - 17:00')
  })
})
