import * as RadixFocusScope from '@radix-ui/react-focus-scope'
import * as RadixPopover from '@radix-ui/react-popover'
import { useCombobox } from 'downshift'
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { LucideIcon } from '../icons'
import { cn } from '../utils/cn'
import { usePopoverMotion } from '../hooks/usePopoverMotion'
import { useInputLabeling, type InputLabelingProps } from '../hooks/useInputLabeling'
import { InputDescription, InputError, InputLabel } from './InputLabeling'
import { ItemListRow } from './ItemListRow'
import { LoadingIndicator } from './Spinner'
import { PopoverPanel } from './Popover'
import type { SelectionSize, SelectionVariant } from '../types/selection'
import {
  filterGroups,
  inputFontSizeClasses,
  itemClasses,
  itemRootSizeClasses,
  toItemListSize,
  triggerBaseClassesFocusWithin,
  triggerSizeClasses,
  triggerVariantClasses,
} from '../utils/selection'
import { OptionIcon } from './OptionIcon'
import '../styles/selection.css'
import {
  comboboxInputClasses,
  customOptionIsVisible,
  isCustomItem,
  isSelectableItem,
  matchesCustom,
  matchesSelectable,
  normalizeComboboxOptions,
} from '../utils/combobox'
import type {
  ComboboxItemSlotProps,
  ComboboxOption,
  ComboboxOptionValue,
  NormalizedGroup,
  NormalizedItem,
  NormalizedSelectable,
} from '../types/combobox'

export interface ComboboxControlSlotProps {
  open: boolean
  disabled: boolean
  query: string
  selectedOption: NormalizedSelectable | null
  displayValue: string
  clear: () => void
  setOpen: (open: boolean) => void
}

export interface ComboboxSearchSlotProps {
  query: string
  setQuery: (value: string) => void
  disabled: boolean
  focus: (options?: FocusOptions) => void
}

export interface ComboboxHandle {
  clear: () => void
  focus: (options?: FocusOptions) => void
}

export interface ComboboxProps extends InputLabelingProps {
  value?: ComboboxOptionValue | null
  onChange?: (value: ComboboxOptionValue | null) => void
  onSelectedOptionChange?: (option: NormalizedItem | null) => void
  options?: ComboboxOption[]
  trigger?: 'input' | 'button' | ((props: ComboboxControlSlotProps) => ReactNode)
  variant?: SelectionVariant
  size?: SelectionSize
  placeholder?: string
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  query?: string
  onQueryChange?: (query: string) => void
  openOnFocus?: boolean
  openOnClick?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  loading?: boolean
  emptyText?: string
  hideSearch?: boolean
  filterable?: boolean
  name?: string
  autoComplete?: string
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  className?: string
  style?: React.CSSProperties
  handleRef?: Ref<ComboboxHandle>
  labelSlot?: ReactNode | ((props: { required: boolean }) => ReactNode)
  descriptionSlot?: ReactNode
  prefix?: (props: ComboboxControlSlotProps) => ReactNode
  suffix?: (props: ComboboxControlSlotProps) => ReactNode
  footer?: (props: ComboboxControlSlotProps) => ReactNode
  searchPrefix?: (props: ComboboxSearchSlotProps) => ReactNode
  searchSuffix?: (props: ComboboxSearchSlotProps) => ReactNode
  item?: (props: ComboboxItemSlotProps) => ReactNode
  itemPrefix?: (props: ComboboxItemSlotProps) => ReactNode
  itemLabel?: (props: ComboboxItemSlotProps) => ReactNode
  itemSuffix?: (props: ComboboxItemSlotProps) => ReactNode
  itemSlots?: Record<string, ((props: ComboboxItemSlotProps) => ReactNode) | undefined>
  groupLabel?: (props: { group: NormalizedGroup }) => ReactNode
  empty?: (props: { query: string }) => ReactNode
}

export function Combobox({
  value = null,
  onChange,
  onSelectedOptionChange,
  options = [],
  trigger = 'input',
  variant = 'subtle',
  size = 'sm',
  placeholder = 'Select option',
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  query: controlledQuery,
  onQueryChange,
  openOnFocus = false,
  openOnClick = true,
  side = 'bottom',
  align = 'start',
  offset = 4,
  loading = false,
  emptyText = 'No results',
  hideSearch = false,
  filterable = true,
  name,
  autoComplete,
  onFocus,
  onBlur,
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
  prefix,
  suffix,
  footer,
  searchPrefix,
  searchSuffix,
  item: itemRenderer,
  itemPrefix,
  itemLabel,
  itemSuffix,
  itemSlots,
  groupLabel,
  empty,
}: ComboboxProps) {
  const isButtonMode = typeof trigger === 'function' || trigger === 'button'
  const customTrigger = typeof trigger === 'function' ? trigger : undefined

  const [internalOpen, setInternalOpen] = useState(false)
  const [internalQuery, setInternalQuery] = useState('')
  const [hasTypedSinceOpen, setHasTypedSinceOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const isQueryBound = controlledQuery !== undefined
  const query = controlledQuery ?? internalQuery

  const { motion, onPointerDown, classifyOpen } = usePopoverMotion()
  const [inputNode, setInputNode] = useState<HTMLInputElement | null>(null)
  const [searchNode, setSearchNode] = useState<HTMLInputElement | null>(null)
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const customTriggerRef = useRef<HTMLDivElement | null>(null)

  const labeling = useInputLabeling({ label, description, error, required, id }, { size, variant, disabled })
  const hasLabeling = Boolean(label || description || labeling.hasError || labelSlot || descriptionSlot)

  const normalizedGroups = useMemo(() => normalizeComboboxOptions(options), [options])
  const allSelectable = useMemo(
    () => normalizedGroups.flatMap((group) => group.options.filter(isSelectableItem)),
    [normalizedGroups],
  )

  const selectedOption =
    value === null || value === undefined ? null : (allSelectable.find((option) => option.value === value) ?? null)
  const displayValue = selectedOption
    ? selectedOption.label
    : value === null || value === undefined
      ? ''
      : String(value)
  const typedQuery = hasTypedSinceOpen ? query : ''

  const [skipDisplay, setSkipDisplay] = useState(isQueryBound && controlledQuery !== '')
  const [previousDisplay, setPreviousDisplay] = useState(displayValue)
  if (previousDisplay !== displayValue) {
    setPreviousDisplay(displayValue)
    setSkipDisplay(false)
  }

  const [previousOpen, setPreviousOpen] = useState(open)
  if (previousOpen !== open) {
    setPreviousOpen(open)
    setHasTypedSinceOpen(isButtonMode && open && isQueryBound ? controlledQuery !== '' : false)
    if (isButtonMode && !isQueryBound) setInternalQuery('')
  }

  const showsTypedQuery = isButtonMode || skipDisplay || (open && hasTypedSinceOpen)
  const inputQuery = showsTypedQuery ? query : displayValue

  useEffect(() => {
    if (isQueryBound && !isButtonMode && inputQuery !== controlledQuery) onQueryChange?.(inputQuery)
  }, [inputQuery, controlledQuery, isQueryBound, isButtonMode, onQueryChange])

  const filteredGroups = useMemo(
    () =>
      filterGroups<NormalizedItem, NormalizedGroup>({
        groups: normalizedGroups,
        open,
        hasTypedSinceOpen,
        query,
        filterable,
        matches: (item, q) => (isCustomItem(item) ? matchesCustom(item, q) : matchesSelectable(item, q)),
        alwaysMatch: (item) => !isCustomItem(item) || customOptionIsVisible(item, typedQuery),
      }),
    [normalizedGroups, open, hasTypedSinceOpen, query, filterable, typedQuery],
  )

  const flatItems = useMemo(() => filteredGroups.flatMap((group) => group.options), [filteredGroups])
  const showEmpty = !loading && flatItems.length === 0

  const setOpen = useCallback(
    (next: boolean) => {
      if (disabled) return
      if (next) classifyOpen()
      setInternalOpen(next)
      onOpenChange?.(next)
    },
    [classifyOpen, disabled, onOpenChange],
  )

  const setQuery = useCallback(
    (next: string) => {
      setInternalQuery(next)
      onQueryChange?.(next)
    },
    [onQueryChange],
  )

  const clear = useCallback(() => {
    onChange?.(null)
    onSelectedOptionChange?.(null)
  }, [onChange, onSelectedOptionChange])

  const commitSelectable = useCallback(
    (option: NormalizedSelectable) => {
      onChange?.(option.value)
      onSelectedOptionChange?.(option)
      setHasTypedSinceOpen(false)
    },
    [onChange, onSelectedOptionChange],
  )

  const runCustom = (item: Extract<NormalizedItem, { type: 'custom' }>) => {
    if (item.disabled) return
    item.onClick({ query: typedQuery })
    if (!item.keepOpen) setOpen(false)
  }

  const downshift = useCombobox<NormalizedItem>({
    items: flatItems,
    isOpen: open,
    inputValue: inputQuery,
    selectedItem: selectedOption,
    itemToString: (item) => item?.label ?? '',
    isItemDisabled: (item) => Boolean(item.disabled),
    defaultHighlightedIndex: 0,
    onIsOpenChange: ({ isOpen }) => setOpen(Boolean(isOpen)),
    onInputValueChange: ({ inputValue, type }) => {
      if (type !== useCombobox.stateChangeTypes.InputChange) return
      const next = inputValue ?? ''
      setSkipDisplay(false)
      setQuery(next)
      setHasTypedSinceOpen(true)
      if (next === '' && !isButtonMode) clear()
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem || !isSelectableItem(selectedItem)) return
      commitSelectable(selectedItem)
    },
    stateReducer: (_state, { type, changes }) => {
      const { stateChangeTypes } = useCombobox
      if (type === stateChangeTypes.InputClick) return { ...changes, isOpen: _state.isOpen }
      if (type === stateChangeTypes.InputBlur && isButtonMode) {
        return { ...changes, isOpen: _state.isOpen, inputValue: _state.inputValue }
      }
      if (type === stateChangeTypes.ItemClick || type === stateChangeTypes.InputKeyDownEnter) {
        return { ...changes, inputValue: _state.inputValue }
      }
      return changes
    },
  })

  const focus = useCallback(
    (focusOptions?: FocusOptions) => {
      const target = isButtonMode ? (searchNode ?? triggerButtonRef.current ?? anchorRef.current) : inputNode
      target?.focus(focusOptions)
    },
    [isButtonMode, searchNode, inputNode],
  )

  useImperativeHandle(handleRef, () => ({ clear, focus }), [clear, focus])

  const slotProps: ComboboxControlSlotProps = {
    open,
    disabled,
    query: typedQuery,
    selectedOption,
    displayValue,
    clear,
    setOpen,
  }
  const searchSlotProps: ComboboxSearchSlotProps = {
    query: typedQuery,
    setQuery: (next) => {
      setQuery(next)
      setHasTypedSinceOpen(next !== '')
    },
    disabled,
    focus: (focusOptions) => searchNode?.focus(focusOptions),
  }

  const ariaProps = {
    'aria-invalid': labeling.hasError || undefined,
    'aria-errormessage': labeling.hasError ? labeling.errorMessageId : undefined,
    'aria-describedby': labeling.describedBy,
    'aria-required': required || undefined,
  }

  const triggerClasses = cn(
    triggerBaseClassesFocusWithin,
    triggerSizeClasses(size),
    inputFontSizeClasses(size),
    triggerVariantClasses(variant, disabled),
  )

  const itemContext = (item: NormalizedItem): ComboboxItemSlotProps => ({
    item,
    query: typedQuery,
    selected: isSelectableItem(item) && item.value === value,
  })

  const renderItemBody = (item: NormalizedItem) => {
    const context = itemContext(item)
    const named = item.slot ? itemSlots?.[`item-${item.slot}`] : undefined

    if (itemRenderer && !named) return itemRenderer(context)
    if (item.slots?.item) return item.slots.item(context)

    return (
      <ItemListRow
        size={toItemListSize(size)}
        selected={context.selected}
        disabled={item.disabled}
        prefix={
          itemPrefix ? (
            itemPrefix(context)
          ) : item.slots?.prefix ? (
            item.slots.prefix(context)
          ) : item.icon ? (
            <OptionIcon icon={item.icon} />
          ) : null
        }
        suffix={
          <>
            {itemSuffix ? itemSuffix(context) : item.slots?.suffix?.(context)}
            {isSelectableItem(item) && context.selected && (
              <LucideIcon name="check" className="ml-1 size-4 text-ink-gray-6" />
            )}
          </>
        }
      >
        {named ? (
          named(context)
        ) : itemLabel ? (
          itemLabel(context)
        ) : item.slots?.label ? (
          item.slots.label(context)
        ) : (
          <div className="min-w-0">
            <div className="truncate">{item.label}</div>
            {item.description && <div className="truncate text-p-sm text-ink-gray-5">{item.description}</div>}
          </div>
        )}
      </ItemListRow>
    )
  }

  const inputProps = downshift.getInputProps({
    id: labeling.inputId,
    name,
    disabled,
    placeholder,
    autoComplete: autoComplete ?? 'off',
    'data-slot': 'input',
    'data-variant': variant,
    'data-size': size,
    ...ariaProps,
    onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(event)
      if (openOnFocus && !isButtonMode) setOpen(true)
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => onBlur?.(event),
    onClick: () => {
      if (openOnClick && !isButtonMode) setOpen(true)
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || !open) return
      const highlighted = flatItems[downshift.highlightedIndex]
      if (highlighted && isCustomItem(highlighted)) {
        event.preventDefault()
        ;(event.nativeEvent as unknown as { preventDownshiftDefault?: boolean }).preventDownshiftDefault = true
        runCustom(highlighted)
      }
    },
  } as never) as React.InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }

  const searchInputProps = downshift.getInputProps(
    {
      id: `${labeling.inputId}-search-input`,
      disabled,
      placeholder,
      autoComplete: autoComplete ?? 'off',
      'data-slot': 'input',
      onFocus: (event: React.FocusEvent<HTMLInputElement>) => onFocus?.(event),
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => onBlur?.(event),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || !open) return
        const highlighted = flatItems[downshift.highlightedIndex]
        if (highlighted && isCustomItem(highlighted)) {
          event.preventDefault()
          ;(event.nativeEvent as unknown as { preventDownshiftDefault?: boolean }).preventDownshiftDefault = true
          runCustom(highlighted)
        }
      },
    } as never,
    { suppressRefError: true },
  ) as React.InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }

  const { ref: downshiftInputRef, ...inputRest } = inputProps as {
    ref?: (node: HTMLInputElement | null) => void
  } & Record<string, unknown>
  const { ref: downshiftSearchRef, ...searchRest } = searchInputProps as {
    ref?: (node: HTMLInputElement | null) => void
  } & Record<string, unknown>

  const menuProps = downshift.getMenuProps({}, { suppressRefError: true })

  const control = (() => {
    if (isButtonMode) {
      return (
        <>
          <RadixPopover.Anchor virtualRef={(customTrigger ? customTriggerRef : triggerButtonRef) as never} />
          <div ref={anchorRef} className="contents" onPointerDown={onPointerDown}>
            {customTrigger ? (
              <div ref={customTriggerRef} onClick={() => setOpen(!open)}>
                {customTrigger(slotProps)}
              </div>
            ) : (
              <button
                ref={triggerButtonRef}
                type="button"
                className={cn(
                  triggerClasses,
                  'justify-between',
                  disabled && 'cursor-not-allowed',
                  hasLabeling ? 'w-full' : className,
                )}
                style={hasLabeling ? undefined : style}
                disabled={disabled}
                data-slot="trigger"
                data-state={open ? 'open' : 'closed'}
                data-variant={variant}
                data-size={size}
                data-invalid={labeling.hasError ? 'true' : undefined}
                data-required={required ? 'true' : undefined}
                id={labeling.inputId}
                aria-haspopup="listbox"
                aria-expanded={open}
                {...ariaProps}
                onClick={() => setOpen(!open)}
              >
                {selectedOption && itemPrefix ? (
                  itemPrefix({ item: selectedOption, query: '', selected: true })
                ) : selectedOption?.icon ? (
                  <OptionIcon icon={selectedOption.icon} />
                ) : !selectedOption && prefix ? (
                  prefix(slotProps)
                ) : null}
                <span
                  className={cn('min-w-0 flex-1 truncate text-left font-normal', !selectedOption && 'text-ink-gray-4')}
                >
                  {selectedOption?.label ?? placeholder}
                </span>
                {suffix ? (
                  suffix(slotProps)
                ) : (
                  <LucideIcon
                    name="chevron-down"
                    className={cn(
                      'size-4 shrink-0 text-ink-gray-4 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
                      open && 'rotate-180',
                    )}
                  />
                )}
              </button>
            )}
          </div>
        </>
      )
    }

    return (
      <RadixPopover.Anchor asChild>
        <div
          ref={anchorRef}
          data-slot="trigger"
          data-state={open ? 'open' : 'closed'}
          data-disabled={disabled ? '' : undefined}
          data-variant={variant}
          data-size={size}
          data-invalid={labeling.hasError ? 'true' : undefined}
          data-required={required ? 'true' : undefined}
          className={cn(triggerClasses, hasLabeling ? 'w-full' : className)}
          style={hasLabeling ? undefined : style}
          onPointerDown={onPointerDown}
        >
          {selectedOption && itemPrefix ? (
            itemPrefix({ item: selectedOption, query: '', selected: true })
          ) : selectedOption?.icon ? (
            <OptionIcon icon={selectedOption.icon} />
          ) : (
            prefix?.(slotProps)
          )}
          <input
            {...inputRest}
            ref={(node) => {
              setInputNode(node)
              downshiftInputRef?.(node)
            }}
            className={cn(comboboxInputClasses, inputFontSizeClasses(size))}
          />
          {suffix ? (
            suffix(slotProps)
          ) : (
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              data-slot="chevron"
              data-state={open ? 'open' : 'closed'}
              aria-label="Toggle options"
              className="inline-flex shrink-0 items-center justify-center text-ink-gray-4 outline-none transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=open]:rotate-180"
              onClick={() => {
                setOpen(!open)
                inputNode?.focus()
              }}
            >
              <LucideIcon name="chevron-down" className="size-4 text-ink-gray-6" />
            </button>
          )}
        </div>
      </RadixPopover.Anchor>
    )
  })()

  const results = (
    <div {...menuProps} className="flex max-h-60 flex-col overflow-auto p-1">
      {loading ? (
        <div data-slot="loading" className="flex items-center gap-2 px-2 py-1.5 text-base text-ink-gray-5">
          <LoadingIndicator className="size-4" />
          <span>Loading...</span>
        </div>
      ) : showEmpty ? (
        <div data-slot="empty" className="px-2 py-1.5 text-base text-ink-gray-5">
          {empty ? empty({ query: typedQuery }) : emptyText}
        </div>
      ) : (
        filteredGroups.map((group, groupIndex) => (
          <div key={group.key ?? `${group.group || 'group'}-${groupIndex}`} data-slot="group" className="flex flex-col">
            {group.group && !group.hideLabel && (
              <div data-slot="group-label" className="flex h-7 items-center px-2 text-sm-medium text-ink-gray-4">
                {groupLabel ? groupLabel({ group }) : group.group}
              </div>
            )}
            {group.options.map((item) => {
              const index = flatItems.indexOf(item)
              const itemProps = downshift.getItemProps({
                item,
                index,
                disabled: item.disabled,
                onClick: (event: React.MouseEvent) => {
                  if (isCustomItem(item)) {
                    ;(event.nativeEvent as unknown as { preventDownshiftDefault?: boolean }).preventDownshiftDefault =
                      true
                    runCustom(item)
                  }
                },
              } as never)
              const selected = isSelectableItem(item) && item.value === value
              return (
                <div
                  key={isSelectableItem(item) ? String(item.value) : item.key}
                  {...itemProps}
                  data-slot="item"
                  data-size={size}
                  data-state={isSelectableItem(item) ? (selected ? 'checked' : 'unchecked') : undefined}
                  data-highlighted={downshift.highlightedIndex === index ? '' : undefined}
                  data-disabled={item.disabled ? '' : undefined}
                  className={cn(itemClasses, itemRootSizeClasses(size), 'cursor-pointer')}
                >
                  {renderItemBody(item)}
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )

  const content = (
    <PopoverPanel motion={motion} className="origin-(--radix-popover-content-transform-origin)">
      {isButtonMode && !hideSearch && (
        <div data-slot="search" className="flex items-center gap-2 border-b border-outline-gray-1 px-3">
          {searchPrefix?.(searchSlotProps)}
          <input
            {...searchRest}
            ref={(node) => {
              setSearchNode(node)
              downshiftSearchRef?.(node)
            }}
            className="min-w-0 flex-1 px-0 border-0 bg-transparent py-2 text-base text-ink-gray-8 outline-none placeholder:text-ink-gray-4 focus:ring-0"
          />
          {searchSuffix?.(searchSlotProps)}
        </div>
      )}
      {results}
      {footer && <div data-slot="footer">{footer(slotProps)}</div>}
    </PopoverPanel>
  )

  const root = (
    <RadixPopover.Root open={open} onOpenChange={(next) => !next && setOpen(false)}>
      {control}
      <RadixPopover.Portal>
        <RadixPopover.Content
          data-slot="content"
          data-selection=""
          data-variant={variant}
          data-size={size}
          data-loading={loading ? '' : undefined}
          data-state={open ? 'open' : 'closed'}
          side={side}
          align={align}
          sideOffset={offset}
          className={cn('z-[100]', !isButtonMode && 'min-w-(--radix-popover-trigger-width)')}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            const target = event.target as Node | null
            if (target && anchorRef.current?.contains(target)) event.preventDefault()
          }}
        >
          {isButtonMode ? (
            <RadixFocusScope.FocusScope
              asChild
              trapped
              onMountAutoFocus={(event) => {
                event.preventDefault()
                if (!hideSearch)
                  requestAnimationFrame(() => document.getElementById(`${labeling.inputId}-search-input`)?.focus())
              }}
              onUnmountAutoFocus={(event) => event.preventDefault()}
            >
              <div>{content}</div>
            </RadixFocusScope.FocusScope>
          ) : (
            content
          )}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )

  if (!hasLabeling) return <div className="contents">{root}</div>

  return (
    <div className={cn('space-y-1.5', className)} style={style}>
      <InputLabel id={labeling.labelId} forId={labeling.inputId} label={label} required={required}>
        {labelSlot}
      </InputLabel>
      <div>{root}</div>
      {(labeling.showDescription || descriptionSlot) && (
        <InputDescription id={labeling.descriptionId} description={description}>
          {descriptionSlot}
        </InputDescription>
      )}
      <InputError id={labeling.errorMessageId} lines={labeling.errorLines} />
    </div>
  )
}
