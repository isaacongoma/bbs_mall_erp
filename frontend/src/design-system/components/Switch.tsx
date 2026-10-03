import * as RadixSwitch from '@radix-ui/react-switch'
import { createElement, useState, type ReactNode } from 'react'
import { Icon } from '../icons'
import type { IconSource } from '../types/icons'
import { useInputLabeling, type InputLabelingProps } from '../hooks/useInputLabeling'
import { cn } from '../utils/cn'
import { InputDescription, InputError, InputLabel } from './InputLabeling'

export interface SwitchProps extends InputLabelingProps {
  value?: boolean
  defaultValue?: boolean
  onChange?: (value: boolean) => void
  size?: 'sm' | 'md'
  disabled?: boolean
  icon?: IconSource
  labelClassName?: string
  labelSlot?: ReactNode | ((props: { required: boolean }) => ReactNode)
  descriptionSlot?: ReactNode
  className?: string
}

const iconClasses = 'me-2 size-4 flex-shrink-0 text-ink-gray-6'

export function Switch({
  value,
  defaultValue = false,
  onChange,
  size = 'sm',
  disabled = false,
  icon,
  label,
  description,
  error,
  required,
  id,
  labelClassName,
  labelSlot,
  descriptionSlot,
  className,
}: SwitchProps) {
  const [internal, setInternal] = useState(defaultValue)
  const checked = value ?? internal
  const labeling = useInputLabeling(
    { label, description, error, required, id },
    { size, disabled, state: checked ? 'checked' : 'unchecked' },
  )

  const hasLabel = Boolean(label) || Boolean(labelSlot)
  const hasDescription = Boolean(description) || Boolean(descriptionSlot)

  const groupClasses = (() => {
    if (!hasLabel && !hasDescription) return undefined
    const classes = ['flex justify-between']
    if (!hasDescription) {
      classes.push('group items-center gap-x-3 py-1.5 cursor-pointer rounded')
      if (disabled) classes.push('cursor-not-allowed')
    } else {
      classes.push('items-start')
      classes.push(size === 'md' ? 'gap-x-3.5' : 'gap-x-2.5')
    }
    return classes.join(' ')
  })()

  const switchClasses = cn(
    'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-transparent transition-colors duration-100 ease-in-out items-center',
    'disabled:cursor-not-allowed disabled:bg-surface-gray-3',
    checked
      ? 'bg-surface-gray-10 enabled:hover:bg-surface-gray-9 active:bg-surface-gray-8 group-hover:enabled:bg-surface-gray-9'
      : 'bg-surface-gray-4 enabled:hover:bg-gray-400 active:bg-gray-500 group-hover:enabled:bg-gray-400',
    size === 'md' ? 'h-5 w-8 border-[3px]' : 'h-4 w-[26px] border-2',
  )

  const thumbClasses = cn(
    'pointer-events-none inline-block transform rounded-full bg-surface-base shadow ring-0 transition duration-100 ease-in-out',
    size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3',
    size === 'md'
      ? checked
        ? 'translate-x-3 rtl:-translate-x-3'
        : 'translate-x-0'
      : checked
        ? 'translate-x-2.5 rtl:-translate-x-2.5'
        : 'translate-x-0',
  )

  return (
    <div className={cn('flex flex-col', className)}>
      <div className={groupClasses}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center">
            {icon &&
              (typeof icon === 'string' ? (
                <Icon source={icon} className={iconClasses} />
              ) : (
                createElement(icon, { className: iconClasses })
              ))}
            <InputLabel
              id={labeling.labelId}
              forId={labeling.inputId}
              label={label}
              required={required}
              className={cn('leading-normal', labelClassName)}
            >
              {labelSlot}
            </InputLabel>
          </div>
        </div>
        <RadixSwitch.Root
          id={labeling.inputId}
          checked={checked}
          onCheckedChange={(next) => {
            setInternal(next)
            onChange?.(next)
          }}
          disabled={disabled}
          aria-required={required || undefined}
          aria-invalid={labeling.hasError || undefined}
          aria-errormessage={labeling.hasError ? labeling.errorMessageId : undefined}
          aria-describedby={labeling.describedBy}
          data-slot="control"
          className={switchClasses}
          {...labeling.dataAttrs}
        >
          <RadixSwitch.Thumb className={thumbClasses} />
        </RadixSwitch.Root>
      </div>
      {(labeling.showDescription || labeling.hasError || descriptionSlot) && (
        <div className="mt-1">
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
