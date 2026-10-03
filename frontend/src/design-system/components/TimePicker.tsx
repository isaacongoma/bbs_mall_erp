import * as RadixPopover from '@radix-ui/react-popover'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { LucideIcon } from '../icons'
import { usePopoverMotion } from '../hooks/usePopoverMotion'
import type { FormError } from '../hooks/useInputLabeling'
import type { InputSize, InputVariant } from '../types/input'
import type { TimeOption } from '../types/time'
import { cn } from '../utils/cn'
import {
  findNearestIndex,
  formatTime,
  generateTimeOptions,
  isOutOfRange,
  minutesFromHHMM,
  normalize24,
  parseFlexibleTime,
} from '../utils/time'
import { TextInput } from './TextInput'

export interface TimePickerHandle {
  focus: () => void
}

export interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  onInputInvalid?: (raw: string) => void
  onInvalidChange?: (invalid: boolean) => void
  interval?: number
  options?: { value: string; label?: string }[]
  format?: string
  min?: string
  max?: string
  placeholder?: string
  variant?: InputVariant
  size?: InputSize
  disabled?: boolean
  typeable?: boolean
  keepOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  openOnFocus?: boolean
  openOnClick?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  id?: string
  label?: string
  description?: string
  error?: string | FormError | null
  required?: boolean
  className?: string
  prefix?: ReactNode
  suffix?: (props: { togglePopover: () => void; isOpen: boolean }) => ReactNode
  handleRef?: Ref<TimePickerHandle>
}

const baseCompare = (value: string) => (value.length === 8 ? value.slice(0, 5) : value)

export function TimePicker({
  value = '',
  onChange,
  onInputInvalid,
  onInvalidChange,
  interval = 15,
  options = [],
  format,
  min,
  max,
  placeholder = 'Select time',
  variant = 'subtle',
  size,
  disabled = false,
  typeable = true,
  keepOpen = false,
  open: controlledOpen,
  onOpenChange,
  openOnFocus = false,
  openOnClick = true,
  side = 'bottom',
  align = 'start',
  offset = 4,
  id,
  label,
  description,
  error,
  required,
  className,
  prefix,
  suffix,
  handleRef,
}: TimePickerProps) {
  const resolvedFormat = format ?? 'HH:mm'
  const isReadonly = !typeable
  const uid = useId()
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen
  const { motion, onPointerDown, classifyOpen } = usePopoverMotion()

  const [inputNode, setInputNode] = useState<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const [canonicalValue, setCanonicalValue] = useState(() => normalize24(value, resolvedFormat))
  const [displayValue, setDisplayValue] = useState(() => formatTime(normalize24(value, resolvedFormat), resolvedFormat))
  const [isTyping, setIsTyping] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [invalid, setInvalid] = useState(false)

  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    const normalized = normalize24(value, resolvedFormat)
    if (normalized !== canonicalValue) {
      setCanonicalValue(normalized)
      if (!isTyping) setDisplayValue(formatTime(normalized, resolvedFormat))
    }
  }

  const minMinutes = minutesFromHHMM(min ?? '')
  const maxMinutes = minutesFromHHMM(max ?? '')

  const displayedOptions = useMemo<TimeOption[]>(() => {
    if (options.length) {
      return options.map((option) => {
        const optionValue = normalize24(option.value) || option.value
        return { value: optionValue, label: option.label || formatTime(optionValue, resolvedFormat) }
      })
    }
    return generateTimeOptions({ interval, format: resolvedFormat, minMinutes, maxMinutes })
  }, [options, interval, resolvedFormat, minMinutes, maxMinutes])

  const typingTarget = useMemo(() => {
    if (!displayedOptions.length) return { exact: null as TimeOption | null, nearest: null as TimeOption | null }
    const parsed = parseFlexibleTime(displayValue, resolvedFormat)
    if (!parsed.valid) return { exact: null, nearest: null }
    const candidate = parsed.ss ? `${parsed.hh24}:${parsed.mm}:${parsed.ss}` : `${parsed.hh24}:${parsed.mm}`
    const base = candidate.length === 8 ? candidate.slice(0, 5) : candidate
    const exact = displayedOptions.find((option) => option.value === base) ?? null
    if (exact) return { exact, nearest: null }
    const index = findNearestIndex(parsed.total, displayedOptions)
    return { exact: null, nearest: index > -1 ? (displayedOptions[index] ?? null) : null }
  }, [displayValue, displayedOptions, resolvedFormat])

  const setOpen = useCallback(
    (next: boolean) => {
      if (next === isOpen) return
      if (next) classifyOpen()
      setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isOpen, classifyOpen, onOpenChange],
  )

  const reportInvalid = (next: boolean) => {
    if (invalid === next) return
    setInvalid(next)
    onInvalidChange?.(next)
  }

  const commit = (next: string) => {
    const previous = canonicalValue
    setCanonicalValue(next)
    setDisplayValue(formatTime(next, resolvedFormat))
    setIsTyping(false)
    if (next !== previous) onChange?.(next)
    reportInvalid(false)
  }

  const blurInput = () => requestAnimationFrame(() => inputNode?.blur())

  const commitTyped = (raw: string) => {
    if (!raw) {
      commit('')
      return
    }
    const formattedCurrent = formatTime(canonicalValue, resolvedFormat)
    if (raw === formattedCurrent) {
      setDisplayValue(formattedCurrent)
      setIsTyping(false)
      reportInvalid(false)
      return
    }
    const parsed = parseFlexibleTime(raw, resolvedFormat)
    if (!parsed.valid || isOutOfRange(parsed.total, minMinutes, maxMinutes)) {
      onInputInvalid?.(raw)
      reportInvalid(true)
      setDisplayValue(formattedCurrent)
      setIsTyping(false)
      return
    }
    const canonical = parsed.ss ? `${parsed.hh24}:${parsed.mm}:${parsed.ss}` : `${parsed.hh24}:${parsed.mm}`
    if (isReadonly) {
      const inList = displayedOptions.some((option) => option.value === baseCompare(canonical))
      if (!inList) {
        const index = findNearestIndex(parsed.total, displayedOptions)
        if (index > -1) {
          const nearest = (displayedOptions[index] as TimeOption).value
          commit(canonical.length === 8 && nearest.length === 5 ? `${nearest}${canonical.slice(5)}` : nearest)
          return
        }
      }
    }
    commit(canonical)
  }

  const selectOption = (next: string) => {
    commit(next)
    if (!keepOpen) {
      setOpen(false)
      blurInput()
    }
  }

  const scrollHighlightedIntoView = (index: number) => {
    requestAnimationFrame(() => {
      const target = displayedOptions[index]?.value
      panelRef.current?.querySelector<HTMLElement>(`[data-value="${target}"]`)?.scrollIntoView({ block: 'nearest' })
    })
  }

  const moveHighlight = (delta: number) => {
    if (!displayedOptions.length) return
    let next: number
    if (highlightIndex === -1) {
      const seed = isTyping ? (typingTarget.exact ?? typingTarget.nearest)?.value : baseCompare(canonicalValue)
      const index = seed ? displayedOptions.findIndex((option) => option.value === seed) : -1
      next = index > -1 ? index : 0
    } else {
      next = (highlightIndex + delta + displayedOptions.length) % displayedOptions.length
    }
    setHighlightIndex(next)
    setIsTyping(false)
    scrollHighlightedIntoView(next)
  }

  const selectAll = () => inputNode?.select()

  const [previousOpen, setPreviousOpen] = useState(isOpen)
  if (previousOpen !== isOpen) {
    setPreviousOpen(isOpen)
    if (isOpen) setHighlightIndex(-1)
    else setIsTyping(false)
  }

  const scrollToSelection = useEffectEvent(() => {
    const target =
      typingTarget.exact?.value ?? typingTarget.nearest?.value ?? (canonicalValue ? baseCompare(canonicalValue) : null)
    if (!target) return
    panelRef.current?.querySelector<HTMLElement>(`[data-value="${target}"]`)?.scrollIntoView({ block: 'center' })
  })

  useEffect(() => {
    if (!isOpen) return
    const frame = requestAnimationFrame(() => scrollToSelection())
    return () => cancelAnimationFrame(frame)
  }, [isOpen])

  useImperativeHandle(handleRef, () => ({ focus: () => inputNode?.focus() }), [inputNode])

  const optionId = (index: number) => `tp-${uid}-${index}`

  const rowClass = (option: TimeOption, index: number): string => {
    if (index === highlightIndex) return 'bg-surface-gray-3 text-ink-gray-8'
    if (isTyping) {
      if (typingTarget.exact && typingTarget.exact.value === option.value) return 'bg-surface-gray-3 text-ink-gray-8'
      if (typingTarget.nearest && typingTarget.nearest.value === option.value)
        return 'bg-surface-gray-2 italic text-ink-gray-7'
      return 'text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-8'
    }
    if (canonicalValue && option.value === baseCompare(canonicalValue)) return 'bg-surface-gray-3 text-ink-gray-8'
    return 'text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-8'
  }

  return (
    <RadixPopover.Root open={isOpen} onOpenChange={setOpen}>
      <RadixPopover.Anchor asChild>
        <div className={className}>
          <TextInput
            inputRef={setInputNode}
            type="text"
            value={displayValue}
            onChange={(next) => {
              setDisplayValue(next)
              if (isOpen && next !== formatTime(canonicalValue, resolvedFormat)) {
                setIsTyping(true)
                setHighlightIndex(-1)
              }
            }}
            className="w-full cursor-text text-sm"
            id={id}
            label={label}
            description={description}
            error={error}
            required={required}
            variant={variant}
            size={size}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={isReadonly}
            onPointerDown={onPointerDown}
            onFocus={() => {
              if (openOnFocus && !isOpen) setOpen(true)
              if (!isReadonly) selectAll()
            }}
            onClick={() => {
              if (openOnClick && !isOpen) setOpen(true)
              if (!isReadonly) selectAll()
            }}
            onBlur={(event) => {
              const next = event.relatedTarget as Node | null
              if (next && panelRef.current?.contains(next)) return
              commitTyped(displayValue)
              setOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                if (isOpen && highlightIndex > -1 && !isTyping) {
                  const highlighted = displayedOptions[highlightIndex]
                  if (highlighted) selectOption(highlighted.value)
                  return
                }
                commitTyped(displayValue)
                if (!keepOpen) {
                  setOpen(false)
                  blurInput()
                }
              } else if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (!isOpen) setOpen(true)
                else moveHighlight(1)
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                if (!isOpen) setOpen(true)
                else moveHighlight(-1)
              } else if (event.key === 'Escape' && isOpen) {
                event.preventDefault()
                setOpen(false)
                blurInput()
              }
            }}
            prefix={prefix}
            suffix={
              suffix ? (
                suffix({ togglePopover: () => setOpen(!isOpen), isOpen })
              ) : (
                <span
                  onMouseDown={(event) => {
                    event.preventDefault()
                    setOpen(!isOpen)
                  }}
                >
                  <LucideIcon name="chevron-down" className="size-4 cursor-pointer" />
                </span>
              )
            }
          />
        </div>
      </RadixPopover.Anchor>

      <RadixPopover.Portal>
        <RadixPopover.Content
          data-slot="content"
          data-selection=""
          className="z-[100]"
          side={side}
          align={align}
          sideOffset={offset}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            const target = event.target as Node | null
            if (target && inputNode?.parentElement?.contains(target)) event.preventDefault()
          }}
        >
          <div
            ref={panelRef}
            data-slot="content-body"
            data-panel=""
            data-motion={motion}
            data-state={isOpen ? 'open' : 'closed'}
            className="time-picker-panel max-h-48 w-44 overflow-y-auto rounded-lg bg-surface-elevation-2 p-1 text-base shadow-2xl ring-1 ring-black/5 focus:outline-none origin-(--radix-popover-content-transform-origin)"
            role="listbox"
            aria-activedescendant={highlightIndex > -1 ? optionId(highlightIndex) : undefined}
          >
            {displayedOptions.map((option, index) => (
              <button
                key={option.value}
                data-value={option.value}
                id={optionId(index)}
                type="button"
                role="option"
                className={cn(
                  'group flex h-7 w-full items-center rounded px-2 text-left tabular-nums',
                  rowClass(option, index),
                )}
                aria-selected={canonicalValue === option.value || undefined}
                onClick={() => selectOption(option.value)}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
