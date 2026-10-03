import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { dayjs, dayjsLocal, type Dayjs } from '@/core/datetime'
import { cn } from '../../utils/cn'
import { CalendarPanel, type CalendarPanelHandle } from './CalendarPanel'
import { DATE_FORMAT, generateWeeks, makeCoercer, makeUnavailableCheck } from '../../utils/date'
import type { CalendarCell } from '../../types/calendar'
import { PickerShell } from './PickerShell'
import { resolvePositioning } from '../../utils/pickerPositioning'
import type { CommonPickerProps } from '../../types/picker'
import { useCalendarView } from '../../hooks/useCalendarView'

export type DateRangeValue = [string, string] | []

export interface DateRangeActionsContext {
  fromDate: string
  toDate: string
  setDate: (date: string | Date | Dayjs) => void
  setRange: (range: [string | Date | Dayjs, string | Date | Dayjs]) => void
  clear: () => void
  close: () => void
}

export interface DateRangePickerProps extends CommonPickerProps {
  value?: string[]
  onChange?: (value: DateRangeValue) => void
  dualPane?: boolean
  actions?: (context: DateRangeActionsContext) => ReactNode
}

const serialize = (from: string, to: string) => (!from && !to ? '' : `${from},${to}`)

export function DateRangePicker({
  value,
  onChange,
  dualPane = false,
  actions,
  variant = 'subtle',
  placeholder = 'Select range',
  typeable = true,
  disabled = false,
  keepOpen = false,
  open: controlledOpen,
  onOpenChange,
  openOnFocus = false,
  openOnClick = true,
  format,
  min,
  max,
  isDateUnavailable,
  trigger,
  prefix,
  suffix,
  className,
  id,
  label,
  description,
  error,
  required,
  size,
  ...positioning
}: DateRangePickerProps) {
  const position = resolvePositioning(positioning)
  const coerce = useMemo(() => makeCoercer(format), [format])
  const checkUnavailable = useMemo(
    () => makeUnavailableCheck(min, max, isDateUnavailable),
    [min, max, isDateUnavailable],
  )

  const normalizeIncoming = (incoming?: string[] | null): [string, string] => {
    if (!incoming || !incoming.length) return ['', '']
    const from = coerce(incoming[0] || '')
    const to = coerce(incoming[1] || '')
    return [from?.format(DATE_FORMAT) ?? '', to?.format(DATE_FORMAT) ?? '']
  }

  const [initialFrom, initialTo] = normalizeIncoming(value)
  const calendar = useCalendarView(initialFrom ? dayjs(initialFrom) : null)
  const { currentYear, currentMonth, focusOn, resetView } = calendar

  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen
  const [fromDate, setFromDate] = useState(initialFrom)
  const [toDate, setToDate] = useState(initialTo)
  const [hoverDate, setHoverDate] = useState<Dayjs | null>(null)
  const [lastEmitted, setLastEmitted] = useState(serialize(initialFrom, initialTo))
  const [isTyping, setIsTyping] = useState(false)
  const [focusedDate, setFocusedDate] = useState<Dayjs | null>(null)
  const leftPanelRef = useRef<CalendarPanelHandle | null>(null)
  const rightPanelRef = useRef<CalendarPanelHandle | null>(null)

  const formatOne = (dateText: string) => {
    if (!dateText) return ''
    const parsed = dayjs(dateText)
    if (!parsed.isValid()) return dateText
    return format ? parsed.format(format) : dateText
  }

  const displayLabel =
    !fromDate && !toDate
      ? ''
      : fromDate && !toDate
        ? formatOne(fromDate)
        : `${formatOne(fromDate)} to ${formatOne(toDate)}`
  const [inputValue, setInputValue] = useState(displayLabel)
  const [lastDisplay, setLastDisplay] = useState(displayLabel)
  if (lastDisplay !== displayLabel) {
    setLastDisplay(displayLabel)
    if (!isTyping) setInputValue(displayLabel)
  }

  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    const [from, to] = normalizeIncoming(value)
    setFromDate(from)
    setToDate(to)
    if (from) focusOn(dayjs(from))
  }

  const setOpen = useCallback(
    (next: boolean) => {
      setInternalOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange],
  )

  const isDualPane = dualPane && calendar.view === 'date'
  const rightAnchor = dayjs().year(currentYear).month(currentMonth).add(1, 'month')
  const rightYear = rightAnchor.year()
  const rightMonth = rightAnchor.month()

  const buildWeeks = (year: number, month: number): CalendarCell[][] => {
    const raw = generateWeeks(year, month, '')
    const from = fromDate ? dayjs(fromDate) : null
    const to = toDate ? dayjs(toDate) : null
    const anchor = hoverDate ?? focusedDate
    const hovering = !to && from && anchor ? anchor : null
    const hoverEnd = hovering && from && hovering.isAfter(from, 'day') ? hovering : null
    const hoverStart = hovering && from && hovering.isBefore(from, 'day') ? hovering : null
    return raw.map((week) =>
      week.map((cell) => {
        const isRangeStart = Boolean(from && cell.date.isSame(from, 'day'))
        const isRangeEnd = Boolean(to && cell.date.isSame(to, 'day'))
        let inRange = false
        if (from && to) inRange = cell.date.isAfter(from, 'day') && cell.date.isBefore(to, 'day')
        else if (hoverEnd && from) inRange = cell.date.isAfter(from, 'day') && !cell.date.isAfter(hoverEnd, 'day')
        else if (hoverStart && from) inRange = !cell.date.isBefore(hoverStart, 'day') && cell.date.isBefore(from, 'day')
        return {
          ...cell,
          isSelected: false,
          isUnavailable: checkUnavailable(cell.date),
          isRangeStart,
          isRangeEnd,
          inRange,
        }
      }),
    )
  }

  const weeks = buildWeeks(currentYear, currentMonth)
  const rightWeeks = isDualPane ? buildWeeks(rightYear, rightMonth) : []

  const emitIfChanged = (from: string, to: string) => {
    const next = serialize(from, to)
    if (next === lastEmitted) return
    onChange?.(from && to ? [from, to] : [])
    setLastEmitted(next)
  }

  const ordered = (from: string, to: string): [string, string] =>
    from && to && dayjs(from).isAfter(dayjs(to)) ? [to, from] : [from, to]

  const parseRangeInput = (raw: string): [Dayjs | null, Dayjs | null] => {
    if (!raw.trim()) return [null, null]
    const normalized = raw.replace(/\s+to\s+/i, ',').replace(/\s+-\s+/g, ',')
    const parts = normalized
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (!parts.length) return [null, null]
    return [coerce(parts[0]), coerce(parts[1])]
  }

  const clearSelection = () => {
    if (!fromDate && !toDate) return
    setFromDate('')
    setToDate('')
    setHoverDate(null)
    emitIfChanged('', '')
    setInputValue('')
  }

  const commitInput = (close = false) => {
    const raw = inputValue.trim()
    if (!raw) {
      clearSelection()
      if (close && !keepOpen) setOpen(false)
      return
    }
    const [parsedFrom, parsedTo] = parseRangeInput(raw)
    let from = fromDate
    let to = toDate
    if (parsedFrom && !checkUnavailable(parsedFrom)) from = parsedFrom.format(DATE_FORMAT)
    if (parsedTo && !checkUnavailable(parsedTo)) to = parsedTo.format(DATE_FORMAT)
    else if (!parsedTo) to = ''
    ;[from, to] = ordered(from, to)
    setFromDate(from)
    setToDate(to)
    emitIfChanged(from, to)
    if (close && !keepOpen && from && to) setOpen(false)
  }

  const handleCellClick = (date: string | Date | Dayjs) => {
    const parsed = dayjs(date as string)
    if (!parsed.isValid() || checkUnavailable(parsed)) return
    const text = parsed.format(DATE_FORMAT)
    let from = fromDate
    let to = toDate
    if (from && to) {
      from = text
      to = ''
    } else if (from && !to) {
      to = text
    } else {
      from = text
    }
    ;[from, to] = ordered(from, to)
    setFromDate(from)
    setToDate(to)
    if (from && to) {
      setHoverDate(null)
      emitIfChanged(from, to)
      if (!keepOpen) setOpen(false)
    }
    setIsTyping(false)
  }

  const handleToday = () => {
    const now = dayjsLocal().startOf('day')
    if (checkUnavailable(now)) return
    const text = now.format(DATE_FORMAT)
    setFromDate(text)
    setToDate(text)
    emitIfChanged(text, text)
    if (!keepOpen) setOpen(false)
    setIsTyping(false)
    resetView()
  }

  const handleSetRange = (range: [string | Date | Dayjs, string | Date | Dayjs]) => {
    const a = dayjs(range[0] as string)
    const b = dayjs(range[1] as string)
    if (!a.isValid() || !b.isValid() || checkUnavailable(a) || checkUnavailable(b)) return
    const [from, to] = ordered(a.format(DATE_FORMAT), b.format(DATE_FORMAT))
    setFromDate(from)
    setToDate(to)
    setHoverDate(null)
    emitIfChanged(from, to)
    focusOn(dayjs(from))
    setIsTyping(false)
    resetView()
  }

  const handleClear = () => {
    clearSelection()
    if (!keepOpen) setOpen(false)
    setIsTyping(false)
    resetView()
  }

  const seedFocusedDate = () => {
    if (focusedDate) return
    if (fromDate) {
      const date = dayjs(fromDate)
      if (!checkUnavailable(date)) {
        setFocusedDate(date)
        return
      }
    }
    const today = dayjsLocal().startOf('day')
    if (!checkUnavailable(today)) {
      setFocusedDate(today)
      return
    }
    const leftFirst = weeks.flat().find((cell) => cell.inMonth && !cell.isUnavailable)
    if (leftFirst) {
      setFocusedDate(leftFirst.date)
      return
    }
    const rightFirst = rightWeeks.flat().find((cell) => cell.inMonth && !cell.isUnavailable)
    if (rightFirst) setFocusedDate(rightFirst.date)
  }

  const handleNavigate = (target: Dayjs) => {
    if (dualPane) {
      const inLeft = target.month() === currentMonth && target.year() === currentYear
      const inRight = target.month() === rightMonth && target.year() === rightYear
      if (inLeft || inRight) {
        setFocusedDate(target)
        return
      }
    }
    focusOn(target)
  }

  return (
    <PickerShell
      open={isOpen}
      onOpenChange={setOpen}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onTypingChange={setIsTyping}
      side={position.side}
      align={position.align}
      offset={position.offset}
      openOnFocus={openOnFocus}
      openOnClick={openOnClick}
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      size={size}
      variant={variant}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={!typeable}
      displayLabel={displayLabel}
      className={className}
      contentClassName="w-fit"
      trigger={trigger}
      prefix={prefix}
      suffix={suffix}
      onBlurCommit={() => commitInput()}
      onEnter={() => commitInput(true)}
      onOpened={() => {
        const [from, to] = normalizeIncoming(value)
        setFromDate(from)
        setToDate(to)
        if (from) focusOn(dayjs(from))
        seedFocusedDate()
      }}
      onClosed={() => {
        resetView()
        setHoverDate(null)
        if (isTyping) {
          commitInput()
          setIsTyping(false)
        }
        setFocusedDate(null)
      }}
      onRequestFocus={() => {
        seedFocusedDate()
        requestAnimationFrame(() => {
          leftPanelRef.current?.focusInitialCell()
          rightPanelRef.current?.focusInitialCell()
        })
      }}
    >
      {({ close }) => (
        <div className={cn('flex', actions && 'divide-x divide-outline-gray-2')}>
          {actions && (
            <aside data-slot="actions" aria-label="Shortcuts" className="flex flex-col p-2 gap-0.5">
              {actions({
                fromDate,
                toDate,
                setDate: handleCellClick,
                setRange: handleSetRange,
                clear: handleClear,
                close,
              })}
            </aside>
          )}
          <div className={cn('flex', isDualPane && 'divide-x divide-outline-gray-2')}>
            <CalendarPanel
              handleRef={leftPanelRef}
              view={calendar.view}
              currentYear={currentYear}
              currentMonth={currentMonth}
              weeks={weeks}
              todayLabel={isDualPane ? '' : 'Today'}
              hideNext={isDualPane}
              hideOutOfMonth={isDualPane}
              centerHeader={isDualPane}
              min={min}
              max={max}
              focusedDate={focusedDate}
              onFocusedDateChange={setFocusedDate}
              onPrev={calendar.prev}
              onNext={calendar.next}
              onToday={handleToday}
              onCycleView={calendar.cycleView}
              onSelectMonth={calendar.selectMonth}
              onSelectYear={calendar.selectYear}
              onSelectDate={handleCellClick}
              onHoverCell={(date) => setHoverDate(fromDate && !toDate ? date : null)}
              onNavigate={handleNavigate}
            />
            {isDualPane && (
              <CalendarPanel
                handleRef={rightPanelRef}
                view={calendar.view}
                currentYear={rightYear}
                currentMonth={rightMonth}
                weeks={rightWeeks}
                hidePrev
                hideToday
                hideOutOfMonth
                centerHeader
                min={min}
                max={max}
                focusedDate={focusedDate}
                onFocusedDateChange={setFocusedDate}
                onNext={calendar.next}
                onCycleView={calendar.cycleView}
                onSelectDate={handleCellClick}
                onHoverCell={(date) => setHoverDate(fromDate && !toDate ? date : null)}
                onNavigate={handleNavigate}
              />
            )}
          </div>
        </div>
      )}
    </PickerShell>
  )
}
