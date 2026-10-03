import * as RadixSelect from '@radix-ui/react-select'
import { useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { LucideIcon } from '../icons'
import { useInputLabeling, type InputLabelingProps } from '../hooks/useInputLabeling'
import type { IconSource } from '../types/icons'
import type { SelectionSize, SelectionVariant } from '../types/selection'
import { cn } from '../utils/cn'
import {
  inputFontSizeClasses,
  itemClasses,
  itemRootSizeClasses,
  toItemListSize,
  triggerSizeClasses,
} from '../utils/selection'
import { InputDescription, InputError, InputLabel } from './InputLabeling'
import { ItemListRow } from './ItemListRow'
import { OptionIcon } from './OptionIcon'
import { PopoverPanel } from './Popover'
import '../styles/selection.css'

export type SelectOptionValue = string | number

export type SelectOption =
  | string
  | {
      label: string
      value: SelectOptionValue
      disabled?: boolean
      icon?: IconSource
      description?: string
      slot?: string
      [key: string]: unknown
    }

export type SelectNormalizedOption = Exclude<SelectOption, string>

export interface SelectSlotProps {
  open: boolean
  disabled: boolean
  selectedOption: SelectNormalizedOption | null
  clear: () => void
  setOpen: (open: boolean) => void
}

export interface SelectItemSlotProps {
  item: SelectNormalizedOption
  selected: boolean
}

export interface SelectHandle {
  clear: () => void
  focus: (options?: FocusOptions) => void
}

export interface SelectProps extends InputLabelingProps {
  value?: SelectOptionValue | null
  onChange?: (value: SelectOptionValue | undefined) => void
  options?: SelectOption[]
  size?: SelectionSize
  variant?: SelectionVariant
  placeholder?: string
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  emptyText?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  name?: string
  className?: string
  style?: React.CSSProperties
  handleRef?: Ref<SelectHandle>
  labelSlot?: ReactNode | ((props: { required: boolean }) => ReactNode)
  descriptionSlot?: ReactNode
  trigger?: (props: SelectSlotProps) => ReactNode
  prefix?: (props: SelectSlotProps) => ReactNode
  suffix?: (props: SelectSlotProps) => ReactNode
  footer?: (props: SelectSlotProps) => ReactNode
  item?: (props: SelectItemSlotProps) => ReactNode
  itemPrefix?: (props: SelectItemSlotProps) => ReactNode
  itemLabel?: (props: SelectItemSlotProps) => ReactNode
  itemSuffix?: (props: SelectItemSlotProps) => ReactNode
  itemSlots?: Record<string, ((props: SelectItemSlotProps) => ReactNode) | undefined>
  empty?: () => ReactNode
}

const triggerBaseClasses =
  'relative inline-flex items-center gap-2 text-left transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=open]:outline-none text-ink-gray-7 data-[placeholder]:text-ink-gray-4 data-[disabled]:text-ink-gray-4'

const triggerContentPadding: Record<SelectionSize, string> = { sm: 'px-2', md: 'px-2.5', lg: 'px-3', xl: 'px-3' }

function triggerVariant(variant: SelectionVariant, disabled: boolean): string {
  if (disabled) {
    return [
      'cursor-not-allowed border',
      variant !== 'ghost' ? 'bg-surface-gray-1' : '',
      variant === 'outline' ? 'border-outline-gray-2' : 'border-transparent',
    ].join(' ')
  }
  return {
    subtle:
      'border border-(--surface-gray-2) bg-surface-gray-2 hover:border-outline-elevation-2 hover:bg-surface-gray-3',
    outline: 'border border-outline-gray-2 bg-surface-base hover:border-outline-gray-3',
    ghost: 'border border-transparent bg-transparent hover:bg-surface-gray-3 focus:bg-surface-gray-3',
  }[variant]
}

function normalize(option: SelectOption): SelectNormalizedOption | null {
  if (!option) return null
  const normalized = typeof option === 'string' ? { label: option, value: option } : option
  if (normalized.value === undefined || normalized.value === null) return null
  return normalized
}

const internalId = (index: number) => `opt:${index}`

export function Select({
  value,
  onChange,
  options = [],
  size = 'sm',
  variant = 'subtle',
  placeholder = 'Select option',
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  emptyText = 'No options',
  side,
  align,
  offset,
  name,
  className,
  style,
  handleRef,
  label,
  description,
  error,
  required,
  id,
  labelSlot,
  descriptionSlot,
  trigger,
  prefix,
  suffix,
  footer,
  item: itemRenderer,
  itemPrefix,
  itemLabel,
  itemSuffix,
  itemSlots,
  empty,
}: SelectProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const labeling = useInputLabeling({ label, description, error, required, id }, { size, variant, disabled })
  const hasLabeling = Boolean(label || description || labeling.hasError || labelSlot || descriptionSlot)
  const usesPopper = side !== undefined || align !== undefined || offset !== undefined

  const selectOptions = useMemo(
    () => options.map(normalize).filter((option): option is SelectNormalizedOption => Boolean(option)),
    [options],
  )

  const selectedIndex = selectOptions.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? (selectOptions[selectedIndex] ?? null) : null
  const isBlank = (v: unknown) => v === '' || v === null || v === undefined
  const showPlaceholder = !selectedOption || (isBlank(selectedOption.value) && isBlank(selectedOption.label))
  const displayValue = showPlaceholder ? placeholder : (selectedOption?.label ?? '')
  const sizingText = displayValue || placeholder

  const setOpen = (next: boolean) => {
    setInternalOpen(next)
    onOpenChange?.(next)
  }
  const clear = () => onChange?.(undefined)

  useImperativeHandle(handleRef, () => ({ clear, focus: (focusOptions) => triggerRef.current?.focus(focusOptions) }))

  const slotProps: SelectSlotProps = { open, disabled, selectedOption, clear, setOpen }
  const itemContext = (option: SelectNormalizedOption): SelectItemSlotProps => ({
    item: option,
    selected: option.value === value,
  })

  const renderRow = (option: SelectNormalizedOption) => {
    const context = itemContext(option)
    const named = option.slot ? itemSlots?.[`item-${option.slot}`] : undefined

    if (itemRenderer && !named) {
      return (
        <RadixSelect.ItemText asChild>
          <div className="w-full min-w-0">{itemRenderer(context)}</div>
        </RadixSelect.ItemText>
      )
    }

    const prefixNode = itemPrefix ? itemPrefix(context) : option.icon ? <OptionIcon icon={option.icon} /> : null

    return (
      <ItemListRow
        size={toItemListSize(size)}
        selected={option.value === value}
        disabled={option.disabled}
        prefix={prefixNode}
        suffix={
          <>
            {itemSuffix?.(context)}
            <RadixSelect.ItemIndicator className="ml-1 inline-flex items-center justify-center">
              <LucideIcon name="check" className="size-4 text-ink-gray-6" />
            </RadixSelect.ItemIndicator>
          </>
        }
      >
        <RadixSelect.ItemText asChild>
          <div className="min-w-0">
            {named ? (
              named(context)
            ) : itemLabel ? (
              itemLabel(context)
            ) : (
              <>
                <div className="truncate">{option.label}</div>
                {option.description && <div className="truncate text-p-sm text-ink-gray-5">{option.description}</div>}
              </>
            )}
          </div>
        </RadixSelect.ItemText>
      </ItemListRow>
    )
  }

  const triggerClasses = cn(
    triggerBaseClasses,
    triggerSizeClasses(size),
    inputFontSizeClasses(size),
    triggerVariant(variant, disabled),
    hasLabeling ? 'w-full' : className,
  )

  const control = (
    <RadixSelect.Root
      value={selectedIndex >= 0 ? internalId(selectedIndex) : ''}
      onValueChange={(next) => {
        const index = Number(next.replace('opt:', ''))
        onChange?.(selectOptions[index]?.value)
      }}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      required={required}
      name={name}
    >
      <RadixSelect.Trigger
        ref={triggerRef}
        id={labeling.inputId}
        data-slot="trigger"
        className={triggerClasses}
        style={hasLabeling ? undefined : style}
        aria-invalid={labeling.hasError || undefined}
        aria-errormessage={labeling.hasError ? labeling.errorMessageId : undefined}
        aria-describedby={labeling.describedBy}
        aria-required={required || undefined}
        data-invalid={labeling.hasError ? 'true' : undefined}
        data-required={required ? 'true' : undefined}
      >
        {trigger ? (
          <>
            {trigger(slotProps)}
            <div
              className={cn(
                'pointer-events-none absolute inset-0 flex items-center overflow-hidden',
                triggerContentPadding[size],
              )}
              aria-hidden="true"
            >
              <RadixSelect.Value
                placeholder={placeholder}
                className={cn('max-w-full truncate opacity-0', showPlaceholder && 'text-ink-gray-4')}
              >
                {selectedOption ? displayValue : undefined}
              </RadixSelect.Value>
            </div>
          </>
        ) : (
          <>
            {selectedOption && itemPrefix ? (
              itemPrefix(itemContext(selectedOption))
            ) : selectedOption?.icon ? (
              <OptionIcon icon={selectedOption.icon} />
            ) : (
              prefix?.(slotProps)
            )}
            <div className="grid min-w-0 text-left truncate">
              <RadixSelect.Value
                placeholder={placeholder}
                className={cn('col-start-1 row-start-1 max-w-full truncate', showPlaceholder && 'text-ink-gray-4')}
              >
                {selectedOption ? displayValue : undefined}
              </RadixSelect.Value>
              <span
                aria-hidden="true"
                className="select-trigger-sizer col-start-1 row-start-1"
                data-width-text={sizingText}
              />
            </div>
            {suffix ? (
              suffix(slotProps)
            ) : (
              <LucideIcon name="chevron-down" className="ml-auto size-4 shrink-0 text-ink-gray-4" />
            )}
          </>
        )}
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          data-slot="content"
          className="z-[100] origin-(--radix-select-content-transform-origin)"
          position={usesPopper ? 'popper' : 'item-aligned'}
          side={side ?? 'bottom'}
          align={align ?? 'start'}
          sideOffset={offset ?? 4}
        >
          <PopoverPanel motion="instant" className="flex flex-col origin-(--radix-select-content-transform-origin)">
            <RadixSelect.Viewport
              className={cn('flex min-h-0 flex-col p-1', usesPopper && 'min-w-(--radix-select-trigger-width)')}
            >
              {!selectOptions.length ? (
                <div data-slot="empty" className="px-2 py-1.5 text-base text-ink-gray-5">
                  {empty ? empty() : emptyText}
                </div>
              ) : (
                selectOptions.map((option, index) => (
                  <RadixSelect.Item
                    key={`${index}:${typeof option.value}:${String(option.value)}`}
                    value={internalId(index)}
                    disabled={option.disabled}
                    data-slot="item"
                    className={cn(itemClasses, itemRootSizeClasses(size), 'outline-none')}
                  >
                    {renderRow(option)}
                  </RadixSelect.Item>
                ))
              )}
            </RadixSelect.Viewport>
            {footer && <div data-slot="footer">{footer(slotProps)}</div>}
          </PopoverPanel>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )

  if (!hasLabeling) return control

  return (
    <div className={cn('space-y-1.5', className)} style={style}>
      <InputLabel id={labeling.labelId} forId={labeling.inputId} label={label} required={required}>
        {labelSlot}
      </InputLabel>
      {control}
      {(labeling.showDescription || descriptionSlot) && (
        <InputDescription id={labeling.descriptionId} description={description}>
          {descriptionSlot}
        </InputDescription>
      )}
      <InputError id={labeling.errorMessageId} lines={labeling.errorLines} />
    </div>
  )
}
