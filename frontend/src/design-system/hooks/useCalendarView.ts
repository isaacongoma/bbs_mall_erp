import { useCallback, useState } from 'react'
import { dayjs, type Dayjs } from '@/core/datetime'
import { monthStart } from '../utils/date'

export type CalendarViewMode = 'date' | 'monthYear'

export function useCalendarView(initial?: Dayjs | null) {
  const [view, setView] = useState<CalendarViewMode>('date')
  const [currentYear, setCurrentYear] = useState(() => (initial ?? dayjs()).year())
  const [currentMonth, setCurrentMonth] = useState(() => (initial ?? dayjs()).month())

  const shiftMonth = useCallback(
    (amount: number) => {
      const target = monthStart(currentYear, currentMonth).add(amount, 'month')
      setCurrentYear(target.year())
      setCurrentMonth(target.month())
    },
    [currentYear, currentMonth],
  )

  const prev = useCallback(() => shiftMonth(-1), [shiftMonth])
  const next = useCallback(() => shiftMonth(1), [shiftMonth])
  const cycleView = useCallback(() => setView((current) => (current === 'date' ? 'monthYear' : 'date')), [])
  const selectMonth = useCallback((index: number) => {
    setCurrentMonth(index)
    setView('date')
  }, [])
  const selectYear = useCallback((year: number) => setCurrentYear(year), [])
  const focusOn = useCallback((date: Dayjs) => {
    setCurrentYear(date.year())
    setCurrentMonth(date.month())
  }, [])
  const resetView = useCallback(() => setView('date'), [])

  return { view, currentYear, currentMonth, prev, next, cycleView, selectMonth, selectYear, focusOn, resetView }
}
