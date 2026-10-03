import { createElement, useState, type ComponentType, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Star } from 'lucide-react'
import { useInputLabeling, type InputLabelingProps } from '../hooks/useInputLabeling'
import type { InputSize } from '../types/input'
import { cn } from '../utils/cn'
import '../styles/rating.css'
import { InputDescription, InputError, InputLabel } from './InputLabeling'

export type RatingStarState = 'filled' | 'preview' | 'removing' | 'empty'

export interface RatingIconSlotProps {
  index: number
  side: 'left' | 'right'
  state: RatingStarState
  leftState: RatingStarState
  rightState: RatingStarState
  value: number
  previewValue: number | null
  max: number
}

export interface RatingProps extends InputLabelingProps {
  value?: number
  onChange?: (value: number) => void
  max?: number
  step?: 1 | 0.5
  disabled?: boolean
  icon?: ComponentType<{ fill?: string; className?: string }>
  size?: InputSize
  className?: string
  labelSlot?: ReactNode | ((props: { required: boolean }) => ReactNode)
  descriptionSlot?: ReactNode
  renderIcon?: (props: RatingIconSlotProps) => ReactNode
}

const SIZE_CLASS: Record<InputSize, string> = { sm: 'size-4', md: 'size-5', lg: 'size-6', xl: 'size-7' }

const HALF_COLOR: Record<RatingStarState, string> = {
  filled: 'text-yellow-500',
  preview: 'text-yellow-200',
  removing: 'text-yellow-300',
  empty: 'text-gray-300 dark:text-gray-600',
}

export function Rating({
  value,
  onChange,
  max = 5,
  step = 1,
  disabled = false,
  icon = Star,
  size = 'md',
  className,
  labelSlot,
  descriptionSlot,
  renderIcon,
  label,
  description,
  error,
  required,
  id,
}: RatingProps) {
  const [internal, setInternal] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const isSlider = step === 0.5

  const labeling = useInputLabeling({ label, description, error, required, id }, { size, disabled })

  const model = value ?? internal
  const roundToStep = (v: number) => Math.round(v / step) * step
  const saved = roundToStep(Math.max(0, Math.min(max, model)))

  const halfState = (half: number): RatingStarState => {
    if (hovered === null) return half <= saved ? 'filled' : 'empty'
    if (half <= Math.min(saved, hovered)) return 'filled'
    if (half <= hovered) return 'preview'
    if (half <= saved) return 'removing'
    return 'empty'
  }

  const formatValue = (v: number) => {
    const display = v % 1 === 0 ? String(v) : v.toFixed(1)
    if (v === 0) return `No rating, out of ${max} stars`
    return `${display} of ${max} stars`
  }

  const setModel = (next: number) => {
    setInternal(next)
    onChange?.(next)
  }

  const commit = (next: number) => {
    let result = Math.max(0, Math.min(max, roundToStep(next)))
    if (result === saved) result = 0
    setModel(result)
  }

  const hitTest = (event: MouseEvent, index: number) => {
    if (!isSlider) return index
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    return event.clientX - rect.left < rect.width / 2 ? index - 0.5 : index
  }

  const starTabIndex = (index: number) => {
    if (isSlider || disabled) return -1
    const selected = Math.ceil(saved)
    return index === (selected > 0 ? selected : 1) ? 0 : -1
  }

  const sliderTarget = (event: KeyboardEvent): number | null => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        return Math.min(max, saved + step)
      case 'ArrowLeft':
      case 'ArrowDown':
        return Math.max(0, saved - step)
      case 'Home':
        return 0
      case 'End':
        return max
      case 'PageUp':
        return Math.min(max, saved + 1)
      case 'PageDown':
        return Math.max(0, saved - 1)
      default:
        return /^[0-9]$/.test(event.key) ? Math.min(max, parseInt(event.key, 10)) : null
    }
  }

  const radioTarget = (event: KeyboardEvent): number | null => {
    const current = focusedIndex || Math.max(1, Math.min(max, Math.ceil(saved) || 1))
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        return Math.min(max, current + 1)
      case 'ArrowLeft':
      case 'ArrowUp':
        return Math.max(1, current - 1)
      case 'Home':
        return 1
      case 'End':
        return max
      case ' ':
      case 'Enter':
        return current
      default:
        if (/^[0-9]$/.test(event.key)) {
          const n = parseInt(event.key, 10)
          return n === 0 ? 0 : Math.min(max, n)
        }
        return null
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (disabled) return
    if (isSlider) {
      const next = sliderTarget(event)
      if (next !== null) {
        event.preventDefault()
        setModel(next)
      }
      return
    }
    const next = radioTarget(event)
    if (next === null) return
    event.preventDefault()
    setModel(next)
    if (next > 0) {
      setFocusedIndex(next)
      requestAnimationFrame(() => root?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus())
    }
  }

  const hasLabeling = Boolean(label || labelSlot || labeling.showDescription || descriptionSlot || labeling.hasError)

  const renderHalf = (index: number, side: 'left' | 'right') => {
    const leftState = halfState(index - 0.5)
    const rightState = halfState(index)
    const state = side === 'left' ? leftState : rightState
    return (
      <span
        className={cn('rating-half', side === 'left' ? 'rating-half-left' : 'rating-half-right', HALF_COLOR[state])}
        data-state={state}
        aria-hidden="true"
      >
        {renderIcon
          ? renderIcon({ index, side, state, leftState, rightState, value: saved, previewValue: hovered, max })
          : createElement(icon, { fill: 'currentColor', className: cn('rating-icon', SIZE_CLASS[size]) })}
      </span>
    )
  }

  const stars = (
    <div
      id={labeling.inputId}
      ref={setRoot}
      className={cn('rating-stars inline-flex shrink-0 gap-0.5 rounded-sm leading-none', !hasLabeling && className)}
      role={isSlider ? 'slider' : 'radiogroup'}
      tabIndex={isSlider ? (disabled ? -1 : 0) : undefined}
      aria-labelledby={labeling.labelledBy}
      aria-describedby={labeling.describedBy}
      aria-errormessage={labeling.hasError ? labeling.errorMessageId : undefined}
      aria-required={required || undefined}
      aria-invalid={labeling.hasError || undefined}
      aria-disabled={disabled || undefined}
      aria-orientation={isSlider ? 'horizontal' : undefined}
      aria-valuemin={isSlider ? 0 : undefined}
      aria-valuemax={isSlider ? max : undefined}
      aria-valuenow={isSlider ? saved : undefined}
      aria-valuetext={isSlider ? formatValue(saved) : undefined}
      data-slot="control"
      {...labeling.dataAttrs}
      onMouseLeave={() => setHovered(null)}
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: max }, (_, position) => {
        const index = position + 1
        return (
          <button
            key={index}
            type="button"
            className={cn(
              'rating-star relative inline-flex shrink-0 rounded-sm',
              SIZE_CLASS[size],
              disabled ? 'cursor-default' : 'cursor-pointer',
            )}
            data-slot="star"
            data-index={index}
            data-state={halfState(index)}
            tabIndex={starTabIndex(index)}
            role={isSlider ? undefined : 'radio'}
            aria-checked={isSlider ? undefined : index === saved}
            aria-posinset={isSlider ? undefined : index}
            aria-setsize={isSlider ? undefined : max}
            aria-label={isSlider ? undefined : `${index} of ${max}`}
            onPointerMove={(event) => {
              if (!disabled) setHovered(hitTest(event, index))
            }}
            onClick={(event) => {
              if (!disabled) commit(hitTest(event, index))
            }}
            onFocus={() => setFocusedIndex(index)}
          >
            {renderHalf(index, 'left')}
            {renderHalf(index, 'right')}
          </button>
        )
      })}
    </div>
  )

  if (!hasLabeling) return stars

  return (
    <div className={cn('space-y-1', className)}>
      {(label || labelSlot) && (
        <InputLabel id={labeling.labelId} label={label} required={required}>
          {labelSlot}
        </InputLabel>
      )}
      {stars}
      {(labeling.showDescription || descriptionSlot) && (
        <InputDescription id={labeling.descriptionId} description={description}>
          {descriptionSlot}
        </InputDescription>
      )}
      <InputError id={labeling.errorMessageId} lines={labeling.errorLines} />
    </div>
  )
}
