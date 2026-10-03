import { useEffect, useImperativeHandle, useMemo, useRef, type Ref } from 'react'
import type { Dayjs } from '@/core/datetime'
import { cn } from '../../utils/cn'
import { Button } from '../Button'
import { DATE_FORMAT, months } from '../../utils/date'
import type { CalendarCell } from '../../types/calendar'
import type { CalendarViewMode } from '../../hooks/useCalendarView'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MAX_SKIP_DISABLED_STEPS = 366

export interface CalendarPanelHandle {
  focusInitialCell: () => void
}

export interface CalendarPanelProps {
  view: CalendarViewMode
  currentYear: number
  currentMonth: number
  weeks: CalendarCell[][]
  todayLabel?: string
  hidePrev?: boolean
  hideNext?: boolean
  hideToday?: boolean
  hideOutOfMonth?: boolean
  centerHeader?: boolean
  min?: string
  max?: string
  focusedDate?: Dayjs | null
  onFocusedDateChange?: (date: Dayjs) => void
  onPrev?: () => void
  onNext?: () => void
  onToday?: () => void
  onCycleView?: () => void
  onSelectMonth?: (index: number) => void
  onSelectYear?: (year: number) => void
  onSelectDate?: (date: Dayjs) => void
  onHoverCell?: (date: Dayjs | null) => void
  onNavigate?: (date: Dayjs) => void
  handleRef?: Ref<CalendarPanelHandle>
}

function cellClass(cell: CalendarCell): string {
  const todayFont = cell.isToday ? 'font-semibold' : ''
  const resting = cn(cell.inMonth ? 'text-ink-gray-8' : 'text-ink-gray-3', cell.isToday && 'text-ink-gray-9')

  if (cell.isUnavailable) return cn('rounded', resting, todayFont, 'opacity-30 cursor-not-allowed')
  if (cell.isRangeStart || cell.isRangeEnd || cell.isSelected) {
    return cn('rounded', todayFont, 'bg-surface-gray-9 text-ink-base hover:bg-surface-gray-9 cursor-pointer')
  }
  if (cell.inRange) return cn('rounded', resting, todayFont, 'bg-surface-gray-3 hover:bg-surface-gray-3 cursor-pointer')
  return cn('rounded', resting, todayFont, 'hover:bg-surface-gray-2 cursor-pointer')
}

function pickInitialFocusDate(weeks: CalendarCell[][]): Dayjs | null {
  const flat = weeks.flat()
  const selected = flat.find(
    (cell) => (cell.isSelected || cell.isRangeStart || cell.isRangeEnd) && !cell.isUnavailable && cell.inMonth,
  )
  if (selected) return selected.date
  const today = flat.find((cell) => cell.isToday && cell.inMonth && !cell.isUnavailable)
  if (today) return today.date
  return flat.find((cell) => cell.inMonth && !cell.isUnavailable)?.date ?? null
}

export function CalendarPanel({
  view,
  currentYear,
  currentMonth,
  weeks,
  todayLabel = '',
  hidePrev = false,
  hideNext = false,
  hideToday = false,
  hideOutOfMonth = false,
  centerHeader = false,
  min,
  max,
  focusedDate,
  onFocusedDateChange,
  onPrev,
  onNext,
  onToday,
  onCycleView,
  onSelectMonth,
  onSelectYear,
  onSelectDate,
  onHoverCell,
  onNavigate,
  handleRef,
}: CalendarPanelProps) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const yearListRef = useRef<HTMLDivElement | null>(null)
  const monthListRef = useRef<HTMLDivElement | null>(null)

  const years = useMemo(() => {
    const minYear = min ? Number(min.slice(0, 4)) : currentYear - 100
    const maxYear = max ? Number(max.slice(0, 4)) : currentYear + 10
    const start = Math.min(minYear, currentYear)
    const end = Math.max(maxYear, currentYear)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [min, max, currentYear])

  useEffect(() => {
    if (view !== 'monthYear') return
    const frame = requestAnimationFrame(() => {
      for (const container of [yearListRef.current, monthListRef.current]) {
        const selected = container?.querySelector<HTMLElement>('[data-selected]')
        if (container && selected) {
          container.scrollTop = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2
        }
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [view])

  const findCell = (date: Dayjs) =>
    gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-value='${date.format(DATE_FORMAT)}']:not([data-outside-view])`,
    ) ?? null

  useEffect(() => {
    if (!focusedDate) return
    const frame = requestAnimationFrame(() => {
      const cell = findCell(focusedDate)
      if (cell && document.activeElement?.hasAttribute('data-value')) cell.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [focusedDate])

  const shiftFocus = (target: Dayjs, direction: 1 | -1, retried = false, steps = 0) => {
    if (min && target.isBefore(min, 'day')) return
    if (max && target.isAfter(max, 'day')) return
    if (steps > MAX_SKIP_DISABLED_STEPS) return

    const cell = findCell(target)
    if (!cell) {
      if (retried) return
      onNavigate?.(target)
      requestAnimationFrame(() => shiftFocus(target, direction, true, steps))
      return
    }
    if (cell.hasAttribute('data-disabled')) {
      shiftFocus(target.add(direction, 'day'), direction, false, steps + 1)
      return
    }
    onFocusedDateChange?.(target)
    cell.focus()
  }

  useImperativeHandle(handleRef, () => ({
    focusInitialCell() {
      const target = focusedDate ?? pickInitialFocusDate(weeks)
      if (!target) return
      onFocusedDateChange?.(target)
      requestAnimationFrame(() => findCell(target)?.focus())
    },
  }))

  const onCellKeyDown = (event: React.KeyboardEvent, cell: CalendarCell) => {
    const date = cell.date
    const select = () => !cell.isUnavailable && onSelectDate?.(date)
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        return shiftFocus(date.subtract(1, 'day'), -1)
      case 'ArrowRight':
        event.preventDefault()
        return shiftFocus(date.add(1, 'day'), 1)
      case 'ArrowUp':
        event.preventDefault()
        return shiftFocus(date.subtract(7, 'day'), -1)
      case 'ArrowDown':
        event.preventDefault()
        return shiftFocus(date.add(7, 'day'), 1)
      case 'Home':
        event.preventDefault()
        return shiftFocus(date.subtract(date.day(), 'day'), -1)
      case 'End':
        event.preventDefault()
        return shiftFocus(date.add(6 - date.day(), 'day'), 1)
      case 'PageUp':
        event.preventDefault()
        return shiftFocus(event.shiftKey ? date.subtract(1, 'year') : date.subtract(1, 'month'), -1)
      case 'PageDown':
        event.preventDefault()
        return shiftFocus(event.shiftKey ? date.add(1, 'year') : date.add(1, 'month'), 1)
      case 'Enter':
      case ' ':
        event.preventDefault()
        return select()
    }
  }

  const header = centerHeader ? (
    <div className="flex items-center justify-between p-2 pb-0 gap-1">
      <Button
        className={cn(hidePrev && 'invisible')}
        label="previous"
        variant="ghost"
        icon="lucide-chevron-left"
        onClick={onPrev}
      />
      <span className="text-sm-medium text-ink-gray-7">
        {months[currentMonth]} {currentYear}
      </span>
      <Button
        className={cn(hideNext && 'invisible')}
        label="next"
        variant="ghost"
        icon="lucide-chevron-right"
        onClick={onNext}
      />
    </div>
  ) : (
    <div className="flex items-center justify-between p-2 pb-0 gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-sm-medium text-ink-gray-7"
        label="cycle-calendar-view"
        onClick={onCycleView}
      >
        {months[currentMonth]} {currentYear}
      </Button>
      {view === 'date' && (
        <div className="flex items-center">
          {!hidePrev && <Button label="previous" variant="ghost" icon="lucide-chevron-left" onClick={onPrev} />}
          {todayLabel && !hideToday && (
            <Button label={todayLabel} variant="ghost" className="text-xs" onClick={onToday} />
          )}
          {!hideNext && <Button label="next" variant="ghost" icon="lucide-chevron-right" onClick={onNext} />}
        </div>
      )}
    </div>
  )

  return (
    <div className="select-none text-base text-ink-gray-9">
      {header}
      <div className="p-2">
        {view === 'date' ? (
          <div ref={gridRef} role="grid" aria-label="Calendar dates" onMouseLeave={() => onHoverCell?.(null)}>
            <div className="flex items-center text-xs-medium uppercase text-ink-gray-4 mb-1 gap-0.5">
              {WEEKDAYS.map((day, index) => (
                <div key={index} className="flex size-7 items-center justify-center">
                  {day}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex gap-0.5" role="row">
                  {week.map((cell) =>
                    hideOutOfMonth && !cell.inMonth ? (
                      <div key={cell.key} className="size-7" aria-hidden="true" />
                    ) : (
                      <button
                        key={cell.key}
                        type="button"
                        className={cn(
                          'flex size-7 items-center justify-center text-sm transition-colors duration-100',
                          cellClass(cell),
                        )}
                        role="gridcell"
                        aria-selected={cell.isSelected || cell.isRangeStart || cell.isRangeEnd}
                        aria-disabled={cell.isUnavailable || undefined}
                        aria-label={cell.date.format(DATE_FORMAT) + (cell.isToday ? ' (Today)' : '')}
                        disabled={cell.isUnavailable}
                        data-value={cell.key}
                        data-outside-view={cell.inMonth ? undefined : ''}
                        data-disabled={cell.isUnavailable ? '' : undefined}
                        tabIndex={focusedDate && cell.date.isSame(focusedDate, 'day') ? 0 : -1}
                        onMouseEnter={() => onHoverCell?.(cell.date)}
                        onClick={() => !cell.isUnavailable && onSelectDate?.(cell.date)}
                        onKeyDown={(event) => onCellKeyDown(event, cell)}
                      >
                        {cell.date.date()}
                      </button>
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-52 w-52" aria-label="Select month and year">
            <div
              ref={yearListRef}
              className="relative flex w-1/2 flex-col gap-0.5 overflow-y-auto"
              role="listbox"
              aria-label="Select year"
            >
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={cn(
                    'w-full text-ink-gray-8 h-7 shrink-0 rounded py-1 text-sm text-center cursor-pointer transition-colors duration-100',
                    year === currentYear ? 'bg-surface-gray-2 hover:bg-surface-gray-3' : 'hover:bg-surface-gray-1',
                  )}
                  data-selected={year === currentYear ? '' : undefined}
                  role="option"
                  aria-selected={year === currentYear}
                  onClick={() => onSelectYear?.(year)}
                >
                  {year}
                </button>
              ))}
            </div>
            <div
              ref={monthListRef}
              className="relative flex w-1/2 flex-col gap-0.5 overflow-y-auto pl-1.5"
              role="listbox"
              aria-label="Select month"
            >
              {months.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  className={cn(
                    'w-full text-ink-gray-8 shrink-0 h-7 rounded py-1 text-sm text-center cursor-pointer transition-colors duration-100',
                    index === currentMonth ? 'bg-surface-gray-2 hover:bg-surface-gray-3' : 'hover:bg-surface-gray-1',
                  )}
                  data-selected={index === currentMonth ? '' : undefined}
                  role="option"
                  aria-selected={index === currentMonth}
                  onClick={() => onSelectMonth?.(index)}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
