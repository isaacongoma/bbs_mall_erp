import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { dayjs, dayjsLocal, dayjsSystem, type Dayjs } from '@/core/datetime'
import { cn } from '../../utils/cn'
import { TimePicker, type TimePickerHandle } from '../TimePicker'
import { CalendarPanel, type CalendarPanelHandle } from './CalendarPanel'
import { DATE_FORMAT, DATE_TIME_FORMAT, generateWeeks, makeCoercer } from '../../utils/date'
import type { CalendarCell } from '../../types/calendar'
import { PickerShell } from './PickerShell'
import { resolvePositioning } from '../../utils/pickerPositioning'
import type { CommonPickerProps } from '../../types/picker'
import { useCalendarView } from '../../hooks/useCalendarView'

export interface DateTimePickerActionsContext {
  selected: string
  time: string
  setDate: (date: string | Date | Dayjs) => void
  clear: () => void
  close: () => void
}

export interface DateTimePickerProps extends CommonPickerProps {
  value?: string
  onChange?: (value: string) => void
  allowCustomTime?: boolean
  actions?: (context: DateTimePickerActionsContext) => ReactNode
}

export function DateTimePicker({
  value = '',
  onChange,
  allowCustomTime = true,
  actions,
  variant = 'subtle',
  placeholder = 'Select date & time',
  typeable = true,
  disabled = false,
  clearable = true,
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
}: DateTimePickerProps) {
  const position = resolvePositioning(positioning)
  const coerce = useMemo(() => makeCoercer(format), [format])
  const minDT = useMemo(() => (min ? coerce(min) : null), [min, coerce])
  const maxDT = useMemo(() => (max ? coerce(max) : null), [max, coerce])

  const checkUnavailable = useCallback(
    (date: Dayjs): boolean => {
      if (isDateUnavailable?.(date)) return true
      if (minDT && date.endOf('day').isBefore(minDT)) return true
      if (maxDT && date.startOf('day').isAfter(maxDT)) return true
      return false
    },
    [isDateUnavailable, minDT, maxDT],
  )

  const initialParts = (incoming: string | undefined): { date: string; time: string } => {
    if (!incoming) {
      if (!clearable) {
        const now = dayjsLocal()
        return { date: now.format(DATE_FORMAT), time: now.format('HH:mm:ss') }
      }
      return { date: '', time: '' }
    }
    const parsed = coerce(incoming)
    if (!parsed) return { date: '', time: '' }
    return { date: parsed.format(DATE_FORMAT), time: parsed.format('HH:mm:ss') }
  }

  const calendar = useCalendarView(coerce(value))
  const { currentYear, currentMonth, focusOn, resetView } = calendar

  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen
  const [parts, setParts] = useState(() => initialParts(value))
  const [initialValue, setInitialValue] = useState(value)
  const [isTyping, setIsTyping] = useState(false)
  const [focusedDate, setFocusedDate] = useState<Dayjs | null>(null)
  const panelRef = useRef<CalendarPanelHandle | null>(null)
  const timeRef = useRef<TimePickerHandle | null>(null)

  const selectedDate = parts.date
  const timeValue = parts.time

  const combinedValue = useMemo(() => {
    if (!selectedDate) return ''
    const local = dayjs(`${selectedDate} ${timeValue || '00:00:00'}`)
    return local.isValid() ? local.format(DATE_TIME_FORMAT) : ''
  }, [selectedDate, timeValue])

  const displayLabel = combinedValue ? (format ? dayjs(combinedValue).format(format) : combinedValue) : ''
  const [inputValue, setInputValue] = useState(displayLabel)
  const [lastDisplay, setLastDisplay] = useState(displayLabel)
  if (lastDisplay !== displayLabel) {
    setLastDisplay(displayLabel)
    if (!isTyping) setInputValue(displayLabel)
  }

  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    const next = initialParts(value)
    setParts(next)
    if (next.date) focusOn(dayjs(next.date))
  }

  const setOpen = useCallback(
    (next: boolean) => {
      setInternalOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange],
  )

  const weeks = useMemo<CalendarCell[][]>(
    () =>
      generateWeeks(currentYear, currentMonth, selectedDate).map((week) =>
        week.map((cell) => ({ ...cell, isUnavailable: checkUnavailable(cell.date) })),
      ),
    [currentYear, currentMonth, selectedDate, checkUnavailable],
  )

  const computedMinTime =
    minDT && selectedDate && dayjs(selectedDate).isSame(minDT, 'day') ? minDT.format('HH:mm:ss') : ''
  const computedMaxTime =
    maxDT && selectedDate && dayjs(selectedDate).isSame(maxDT, 'day') ? maxDT.format('HH:mm:ss') : ''

  const clampTime = (date: string, time: string): string => {
    if (!date || !time) return time
    const current = dayjs(`${date} ${time}`)
    if (minDT && current.isBefore(minDT)) return computedMinTime || time
    if (maxDT && current.isAfter(maxDT)) return computedMaxTime || time
    return time
  }

  const emitChange = (date: string, time: string) => {
    if (!date) return
    const local = dayjs(`${date} ${time || '00:00:00'}`).format(DATE_TIME_FORMAT)
    const system = dayjsSystem(local).format(DATE_TIME_FORMAT)
    if (system !== initialValue) {
      onChange?.(system)
      setInitialValue(system)
    }
    if (!isTyping) {
      const label = format ? dayjs(local).format(format) : local
      setInputValue(label)
    }
  }

  const clearSelection = () => {
    if (!selectedDate && !timeValue) return
    setParts({ date: '', time: '' })
    onChange?.('')
    setInitialValue('')
    setInputValue('')
  }

  const selectDate = (date: string | Date | Dayjs): string | null => {
    const parsed = dayjs(date as string)
    if (!parsed.isValid() || checkUnavailable(parsed)) return null
    const next = parsed.format(DATE_FORMAT)
    focusOn(parsed)
    return next
  }

  const commitInput = (close = false) => {
    const raw = inputValue.trim()
    if (!raw) {
      if (!clearable) {
        const now = dayjsLocal()
        const date = now.format(DATE_FORMAT)
        const time = now.format('HH:mm:ss')
        setParts({ date, time })
        emitChange(date, time)
      } else {
        clearSelection()
      }
      if (close && !keepOpen) setOpen(false)
      return
    }
    const parsed = coerce(raw)
    if (parsed && !checkUnavailable(parsed)) {
      const date = selectDate(parsed)
      if (date) {
        const time = parsed.format('HH:mm:ss')
        setParts({ date, time })
        emitChange(date, time)
      }
      if (close && !keepOpen) setOpen(false)
    } else {
      setInputValue(displayLabel)
    }
  }

  const handleDateClick = (date: string | Date | Dayjs) => {
    const next = selectDate(date)
    if (!next) return
    const time = clampTime(next, timeValue)
    setParts({ date: next, time })
    emitChange(next, time)
    setIsTyping(false)
    resetView()
    requestAnimationFrame(() => timeRef.current?.focus())
  }

  const handleTimeChange = (next: string) => {
    const time = clampTime(selectedDate, next)
    setParts((current) => ({ ...current, time }))
    setIsTyping(false)
    if (selectedDate) emitChange(selectedDate, time)
  }

  const handleNow = () => {
    const now = dayjsLocal()
    const date = selectDate(now)
    if (!date) return
    const time = now.format('HH:mm:ss')
    setParts({ date, time })
    emitChange(date, time)
    if (!keepOpen) setOpen(false)
    setIsTyping(false)
  }

  const handleClear = () => {
    clearSelection()
    if (!keepOpen) setOpen(false)
    setIsTyping(false)
    resetView()
  }

  const seedFocusedDate = () => {
    if (focusedDate) return
    if (selectedDate) {
      const date = dayjs(selectedDate)
      if (!checkUnavailable(date)) {
        setFocusedDate(date)
        return
      }
    }
    const today = dayjsLocal()
    if (!checkUnavailable(today)) {
      setFocusedDate(today)
      return
    }
    const first = weeks.flat().find((cell) => cell.inMonth && !cell.isUnavailable)
    if (first) setFocusedDate(first.date)
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
      contentClassName={actions ? 'w-fit' : 'w-56'}
      trigger={trigger}
      prefix={prefix}
      suffix={suffix}
      onBlurCommit={() => commitInput()}
      onEnter={() => commitInput(true)}
      onOpened={() => {
        const next = initialParts(value)
        setParts(next)
        if (next.date) focusOn(dayjs(next.date))
        seedFocusedDate()
      }}
      onClosed={() => {
        resetView()
        if (isTyping) {
          commitInput()
          setIsTyping(false)
        }
        setFocusedDate(null)
      }}
      onRequestFocus={() => {
        seedFocusedDate()
        requestAnimationFrame(() => panelRef.current?.focusInitialCell())
      }}
    >
      {({ close }) => (
        <div className={cn('flex', actions && 'divide-x divide-outline-gray-2')}>
          {actions && (
            <aside data-slot="actions" aria-label="Shortcuts" className="flex flex-col p-2 gap-0.5">
              {actions({
                selected: selectedDate,
                time: timeValue,
                setDate: handleDateClick,
                clear: handleClear,
                close,
              })}
            </aside>
          )}
          <div className="flex flex-col">
            <CalendarPanel
              handleRef={panelRef}
              view={calendar.view}
              currentYear={currentYear}
              currentMonth={currentMonth}
              weeks={weeks}
              todayLabel="Now"
              min={min}
              max={max}
              focusedDate={focusedDate}
              onFocusedDateChange={setFocusedDate}
              onPrev={calendar.prev}
              onNext={calendar.next}
              onToday={handleNow}
              onCycleView={calendar.cycleView}
              onSelectMonth={calendar.selectMonth}
              onSelectYear={calendar.selectYear}
              onSelectDate={handleDateClick}
              onNavigate={focusOn}
            />
            <div className="flex flex-col gap-2 p-2 pt-0">
              <TimePicker
                handleRef={timeRef}
                value={timeValue}
                typeable={allowCustomTime}
                side="bottom"
                align="start"
                placeholder="Select time"
                min={computedMinTime}
                max={computedMaxTime}
                onChange={handleTimeChange}
              />
            </div>
          </div>
        </div>
      )}
    </PickerShell>
  )
}
