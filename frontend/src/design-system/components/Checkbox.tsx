import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../utils/cn'
import { useInputLabeling, type InputLabelingProps } from '../hooks/useInputLabeling'
import { InputDescription, InputError, InputLabel } from './InputLabeling'

export interface CheckboxProps
  extends
    InputLabelingProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange' | 'value' | 'id' | 'defaultValue'> {
  value?: boolean | 0 | 1
  onChange?: (checked: boolean) => void
  size?: 'sm' | 'md'
  padding?: boolean
  indeterminate?: boolean
  labelSlot?: ReactNode | ((props: { required: boolean }) => ReactNode)
  descriptionSlot?: ReactNode
}

export function Checkbox({
  value,
  onChange,
  size = 'sm',
  padding = false,
  indeterminate = false,
  disabled = false,
  label,
  description,
  error,
  required,
  id,
  labelSlot,
  descriptionSlot,
  className,
  ...rest
}: CheckboxProps) {
  const checked = Boolean(value)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const labeling = useInputLabeling(
    { label, description, error, required, id },
    { size, disabled, state: checked ? 'checked' : 'unchecked' },
  )

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  const rowClasses = cn(
    padding && size === 'sm' && 'px-2.5 py-1.5',
    padding && size === 'md' && 'px-3 py-2',
    padding &&
      !disabled &&
      'focus-within:bg-surface-gray-2 focus-within:ring-2 focus-within:ring-outline-gray-3 hover:bg-surface-gray-3 active:bg-surface-gray-4',
  )

  const inputClasses = cn(
    disabled
      ? 'border-outline-gray-2 bg-surface-sidebar text-ink-gray-3'
      : 'border-outline-gray-4 text-ink-gray-9 hover:border-outline-gray-7 focus:ring-offset-0 focus:border-outline-gray-8 active:border-outline-gray-6 transition',
    !disabled && (padding ? 'focus:ring-0' : 'hover:shadow-sm focus:ring-0 active:bg-surface-gray-2'),
    size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4',
  )

  return (
    <div className="inline-flex flex-col">
      <div className={cn('inline-flex gap-2 rounded transition', rowClasses)}>
        <input
          ref={inputRef}
          type="checkbox"
          className={cn('rounded-sm mt-[1px] bg-surface-base checked:bg-current checked:border-transparent indeterminate:bg-current', inputClasses, className)}
          disabled={disabled}
          id={labeling.inputId}
          checked={checked}
          required={required}
          aria-required={required || undefined}
          aria-invalid={labeling.hasError || undefined}
          aria-errormessage={labeling.hasError ? labeling.errorMessageId : undefined}
          aria-describedby={labeling.describedBy}
          data-slot="control"
          {...labeling.dataAttrs}
          {...rest}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <InputLabel
          id={labeling.labelId}
          forId={labeling.inputId}
          label={label}
          required={required}
          color="gray-7"
          className="select-none"
        >
          {labelSlot}
        </InputLabel>
      </div>
      {(labeling.showDescription || labeling.hasError) && (
        <div className="ps-6 mt-1">
          {(labeling.showDescription || descriptionSlot) && (
            <InputDescription id={labeling.descriptionId} description={description}>
              {descriptionSlot}
            </InputDescription>
          )}
          <InputError id={labeling.errorMessageId} lines={labeling.errorLines} />
        </div>
      )}
    </div>
  )
}
