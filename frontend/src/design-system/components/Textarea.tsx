import { useEffect, useRef, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react'
import { useInputLabeling, type InputLabelingProps } from '../hooks/useInputLabeling'
import type { InputSize, InputVariant } from '../types/input'
import { cn } from '../utils/cn'
import { variantClasses } from '../utils/textField'
import { InputDescription, InputError, InputLabel } from './InputLabeling'

export interface TextareaProps
  extends
    InputLabelingProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'value' | 'onChange' | 'id' | 'defaultValue'> {
  value?: string | null
  onChange?: (value: string) => void
  size?: InputSize
  variant?: InputVariant
  debounce?: number
  labelSlot?: ReactNode | ((props: { required: boolean }) => ReactNode)
  descriptionSlot?: ReactNode
  textareaRef?: Ref<HTMLTextAreaElement>
  wrapperClassName?: string
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'text-base rounded',
  md: 'text-base rounded',
  lg: 'text-lg rounded-md',
  xl: 'text-2xl rounded-md',
}

const paddingClasses: Record<InputSize, string> = {
  sm: 'py-1.5 px-2',
  md: 'py-1.5 px-2.5',
  lg: 'py-1.5 px-3',
  xl: 'py-1.5 px-3',
}

export function Textarea({
  value,
  onChange,
  size = 'sm',
  variant = 'subtle',
  debounce: debounceMs,
  disabled = false,
  rows = 3,
  label,
  description,
  error,
  required,
  id,
  labelSlot,
  descriptionSlot,
  textareaRef,
  className,
  wrapperClassName,
  style,
  ...rest
}: TextareaProps) {
  const labeling = useInputLabeling({ label, description, error, required, id }, { size, variant, disabled })
  const hasLabeling = Boolean(label || labelSlot || labeling.showDescription || descriptionSlot || labeling.hasError)

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  const handleChange = (next: string) => {
    if (!debounceMs) {
      onChange?.(next)
      return
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange?.(next), debounceMs)
  }

  const field = (
    <textarea
      ref={textareaRef}
      className={cn(
        sizeClasses[size],
        paddingClasses[size],
        variantClasses(variant, disabled),
        disabled ? 'text-ink-gray-5' : 'text-ink-gray-8',
        'transition-colors w-full block',
        !hasLabeling && className,
      )}
      style={hasLabeling ? undefined : style}
      disabled={disabled}
      id={labeling.inputId}
      value={value === undefined ? undefined : (value ?? '')}
      rows={rows}
      required={required}
      aria-required={required || undefined}
      aria-invalid={labeling.hasError || undefined}
      aria-errormessage={labeling.hasError ? labeling.errorMessageId : undefined}
      aria-describedby={labeling.describedBy}
      data-slot="control"
      {...labeling.dataAttrs}
      {...rest}
      onChange={(event) => handleChange(event.target.value)}
    />
  )

  if (!hasLabeling) return field

  return (
    <div className={cn('space-y-1.5', wrapperClassName ?? className)} style={style}>
      <InputLabel id={labeling.labelId} forId={labeling.inputId} label={label} required={required}>
        {labelSlot}
      </InputLabel>
      {field}
      {(labeling.showDescription || descriptionSlot) && (
        <InputDescription id={labeling.descriptionId} description={description}>
          {descriptionSlot}
        </InputDescription>
      )}
      <InputError id={labeling.errorMessageId} lines={labeling.errorLines} />
    </div>
  )
}
