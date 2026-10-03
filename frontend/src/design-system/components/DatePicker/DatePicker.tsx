import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { dayjs, dayjsLocal, type Dayjs } from '@/core/datetime'
import { CalendarPanel, type CalendarPanelHandle } from './CalendarPanel'
import { DATE_FORMAT, formatByPattern, generateWeeks, makeCoercer, makeUnavailableCheck } from '../../utils/date'
import type { CalendarCell } from '../../types/calendar'
import { PickerShell } from './PickerShell'
import { resolvePositioning } from '../../utils/pickerPositioning'
import type { CommonPickerProps } from '../../types/picker'
import { useCalendarView } from '../../hooks/useCalendarView'
import { cn } from '../../utils/cn'

export interface DatePickerActionsContext {
  selected: string
  setDate: (date: string | Date | Dayjs) => void
  clear: () => void
  close: () => void
}

export interface DatePickerProps extends CommonPickerProps {
  value?: string
  onChange?: (value: string) => void
  actions?: (context: DatePickerActionsContext) => ReactNode
}

export function DatePicker({
  value = '',
  onChange,
  actions,
  variant = 'subtle',
  placeholder = 'Select date',
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
}: DatePickerProps) {
  const position = resolvePositioning(positioning)
  const coerce = useMemo(() => makeCoercer(format), [format])
  const checkUnavailable = useMemo(
    () => makeUnavailableCheck(min, max, isDateUnavailable),
    [min, max, isDateUnavailable],
  )

  const resolveSelected = (incoming: string | undefined): string => {
    if (!incoming) return clearable ? '' : dayjsLocal().format(DATE_FORMAT)
    return coerce(incoming)?.format(DATE_FORMAT) ?? ''
  }

  const calendar = useCalendarView(coerce(value))
  const { currentYear, currentMonth, focusOn, resetView } = calendar

  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen
  const [selected, setSelected] = useState(() => resolveSelected(value))
  const [initialValue, setInitialValue] = useState(value)
  const [isTyping, setIsTyping] = useState(false)
  const [focusedDate, setFocusedDate] = useState<Dayjs | null>(null)
  const panelRef = useRef<CalendarPanelHandle | null>(null)

  const displayLabel = format ? formatByPattern(selected, format) : selected
  const [inputValue, setInputValue] = useState(displayLabel)
  const [lastDisplay, setLastDisplay] = useState(displayLabel)
  if (lastDisplay !== displayLabel) {
    setLastDisplay(displayLabel)
    if (!isTyping) setInputValue(displayLabel)
  }

  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    const next = resolveSelected(value)
    setSelected(next)
    if (next) focusOn(dayjs(next))
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
      generateWeeks(currentYear, currentMonth, selected).map((week) =>
        week.map((cell) => ({ ...cell, isUnavailable: checkUnavailable(cell.date) })),
      ),
    [currentYear, currentMonth, selected, checkUnavailable],
  )

  const emitChange = (next: string) => {
    if (next === initialValue) return
    onChange?.(next)
    setInitialValue(next)
  }

  const clearSelection = () => {
    if (!selected) return
    setSelected('')
    emitChange('')
    setInitialValue('')
    setInputValue('')
  }

  const selectDate = (date: string | Date | Dayjs) => {
    const parsed = dayjs(date as string)
    if (!parsed.isValid() || checkUnavailable(parsed)) return
    const next = parsed.format(DATE_FORMAT)
    setSelected(next)
    focusOn(parsed)
    emitChange(next)
    if (!isTyping) setInputValue(format ? formatByPattern(next, format) : next)
    resetView()
  }

  const commitInput = (close = false) => {
    const raw = inputValue.trim()
    if (!raw) {
      if (!clearable) selectDate(dayjsLocal())
      else clearSelection()
      if (close && !keepOpen) setOpen(false)
      return
    }
    const parsed = coerce(raw)
    if (parsed && !checkUnavailable(parsed)) {
      selectDate(parsed)
      if (close && !keepOpen) setOpen(false)
    } else {
      setInputValue(displayLabel)
    }
  }

  const handleCellClick = (date: string | Date | Dayjs) => {
    selectDate(date)
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
    if (selected) {
      const date = dayjs(selected)
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
        const next = resolveSelected(value)
        setSelected(next)
        if (next) focusOn(dayjs(next))
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
              {actions({ selected, setDate: handleCellClick, clear: handleClear, close })}
            </aside>
          )}
          <CalendarPanel
            handleRef={panelRef}
            view={calendar.view}
            currentYear={currentYear}
            currentMonth={currentMonth}
            weeks={weeks}
            todayLabel="Today"
            min={min}
            max={max}
            focusedDate={focusedDate}
            onFocusedDateChange={setFocusedDate}
            onPrev={calendar.prev}
            onNext={calendar.next}
            onToday={() => handleCellClick(dayjsLocal())}
            onCycleView={calendar.cycleView}
            onSelectMonth={calendar.selectMonth}
            onSelectYear={calendar.selectYear}
            onSelectDate={handleCellClick}
            onNavigate={focusOn}
          />
        </div>
      )}
    </PickerShell>
  )
}
