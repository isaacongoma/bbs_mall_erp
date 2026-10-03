import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import type { InputLabelingProps } from '../hooks/useInputLabeling'
import type { DurationFormat } from '../types/duration'
import type { InputSize, InputVariant } from '../types/input'
import { formatDuration, parseDuration } from '../utils/duration'
import { TextInput } from './TextInput'

export interface DurationHandle {
  focus: () => void
}

export interface DurationProps extends InputLabelingProps {
  value?: number | null
  onChange?: (value: number | null) => void
  placeholder?: string
  format?: DurationFormat
  size?: InputSize
  variant?: InputVariant
  disabled?: boolean
  handleRef?: Ref<DurationHandle>
}

const INVALID_MESSAGE = 'Invalid format. Try: 1h 30m 45s, 1 hour 30 minutes, 1:30:45, 90s'

export function Duration({
  value = null,
  onChange,
  placeholder = '1h 30m 45s',
  format = 'short',
  size,
  variant,
  disabled,
  handleRef,
  label,
  description,
  error,
  required,
  id,
}: DurationProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [internalError, setInternalError] = useState('')
  const cancelled = useRef(false)

  useImperativeHandle(handleRef, () => ({ focus: () => inputRef.current?.focus() }), [])

  const displayValue = focused || internalError ? editValue : formatDuration(value, format)

  const handleFocus = () => {
    if (focused) return
    setFocused(true)
    setEditValue(formatDuration(value, 'short'))
    setInternalError('')
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const commit = () => {
    const raw = editValue.trim()
    if (raw === '') {
      setInternalError('')
      setFocused(false)
      onChange?.(null)
      return
    }
    const seconds = parseDuration(raw)
    if (seconds === null) {
      setInternalError(INVALID_MESSAGE)
      setFocused(false)
      return
    }
    setInternalError('')
    setFocused(false)
    onChange?.(seconds)
  }

  const handleBlur = () => {
    if (cancelled.current) {
      cancelled.current = false
      setFocused(false)
      setInternalError('')
      return
    }
    commit()
  }

  return (
    <TextInput
      inputRef={inputRef}
      id={id}
      value={displayValue}
      label={label}
      description={description}
      error={error || internalError}
      required={required}
      disabled={disabled}
      size={size}
      variant={variant}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(next) => {
        setEditValue(next)
        setInternalError('')
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          inputRef.current?.blur()
        } else if (event.key === 'Escape') {
          cancelled.current = true
          inputRef.current?.blur()
        }
      }}
    />
  )
}
