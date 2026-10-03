import { useEffect, useRef, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { useInputLabeling, type InputLabelingProps } from '../hooks/useInputLabeling'
import type { InputSize, InputVariant } from '../types/input'
import { cn } from '../utils/cn'
import { variantClasses } from '../utils/textField'
import { InputDescription, InputError, InputLabel } from './InputLabeling'

export interface TextInputProps
  extends
    InputLabelingProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix' | 'id' | 'defaultValue'> {
  value?: string | number | null
  onChange?: (value: string) => void
  size?: InputSize
  variant?: InputVariant
  debounce?: number
  prefix?: ReactNode
  suffix?: ReactNode
  labelSlot?: ReactNode | ((props: { required: boolean }) => ReactNode)
  descriptionSlot?: ReactNode
  inputRef?: Ref<HTMLInputElement>
  wrapperClassName?: string
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'text-base rounded h-7',
  md: 'text-base rounded h-8',
  lg: 'text-lg rounded-md h-10',
  xl: 'text-2xl rounded-md h-10',
}

const prefixPadding: Record<InputSize, string> = { sm: 'ps-8', md: 'ps-9', lg: 'ps-10', xl: 'ps-10' }
const suffixPadding: Record<InputSize, string> = { sm: 'pe-8', md: 'pe-9', lg: 'pe-10', xl: 'pe-10' }
const basePrefix: Record<InputSize, string> = { sm: 'ps-2', md: 'ps-2.5', lg: 'ps-3', xl: 'ps-3' }
const baseSuffix: Record<InputSize, string> = { sm: 'pe-2', md: 'pe-2.5', lg: 'pe-3', xl: 'pe-3' }

export function TextInput({
  type = 'text',
  value,
  onChange,
  size = 'sm',
  variant = 'subtle',
  debounce: debounceMs,
  disabled = false,
  label,
  description,
  error,
  required,
  id,
  prefix,
  suffix,
  labelSlot,
  descriptionSlot,
  inputRef,
  className,
  wrapperClassName,
  style,
  ...rest
}: TextInputProps) {
  const labeling = useInputLabeling({ label, description, error, required, id }, { size, variant, disabled })
  const hasLabeling = Boolean(label || description || labeling.hasError || labelSlot || descriptionSlot)

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

  const textColor = disabled ? 'text-ink-gray-5' : 'text-ink-gray-8'

  const input = (
    <div
      className={cn('relative flex items-center', !hasLabeling && className)}
      style={hasLabeling ? undefined : style}
    >
      {prefix && (
        <div className={cn('absolute inset-y-0 start-0 flex items-center', textColor, basePrefix[size])}>{prefix}</div>
      )}
      <input
        ref={inputRef}
        type={type}
        className={cn(
          sizeClasses[size],
          'py-1.5',
          prefix ? prefixPadding[size] : basePrefix[size],
          suffix ? suffixPadding[size] : baseSuffix[size],
          variantClasses(variant, disabled),
          textColor,
          'transition-colors w-full dark:[color-scheme:dark]',
        )}
        disabled={disabled}
        id={labeling.inputId}
        value={value === undefined ? undefined : (value ?? '')}
        required={required}
        aria-required={required || undefined}
        aria-invalid={labeling.hasError || undefined}
        aria-errormessage={labeling.hasError ? labeling.errorMessageId : undefined}
        aria-describedby={labeling.describedBy}
        data-slot="control"
        autoComplete="off"
        {...labeling.dataAttrs}
        {...rest}
        onChange={(event) => handleChange(event.target.value)}
      />
      {suffix && (
        <div className={cn('absolute inset-y-0 end-0 flex items-center', textColor, baseSuffix[size])}>{suffix}</div>
      )}
    </div>
  )

  if (!hasLabeling) return input

  return (
    <div className={cn('space-y-1.5', wrapperClassName ?? className)} style={style}>
      <InputLabel id={labeling.labelId} forId={labeling.inputId} label={label} required={required}>
        {labelSlot}
      </InputLabel>
      {input}
      {(labeling.showDescription || descriptionSlot) && (
        <InputDescription id={labeling.descriptionId} description={description}>
          {descriptionSlot}
        </InputDescription>
      )}
      <InputError id={labeling.errorMessageId} lines={labeling.errorLines} />
    </div>
  )
}
