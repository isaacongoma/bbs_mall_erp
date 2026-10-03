import * as RadixFocusScope from '@radix-ui/react-focus-scope'
import * as RadixPopover from '@radix-ui/react-popover'
import { useCombobox } from 'downshift'
import { useCallback, useImperativeHandle, useMemo, useState, type ReactNode, type Ref } from 'react'
import { LucideIcon } from '../icons'
import { useInputLabeling, type InputLabelingProps } from '../hooks/useInputLabeling'
import { usePopoverMotion } from '../hooks/usePopoverMotion'
import '../styles/selection.css'
import type {
  ComboboxGroupedOption,
  ComboboxItemSlotProps,
  ComboboxSelectableOption,
  NormalizedGroup,
  NormalizedSelectable,
} from '../types/combobox'
import type { SelectionSize, SelectionVariant } from '../types/selection'
import { cn } from '../utils/cn'
import { isSelectableItem, normalizeComboboxOptions, matchesSelectable } from '../utils/combobox'
import {
  filterGroups,
  inputFontSizeClasses,
  itemClasses,
  itemRootSizeClasses,
  toItemListSize,
  triggerBaseClassesFocusVisible,
  triggerSizeClasses,
  triggerVariantClasses,
} from '../utils/selection'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { InputDescription, InputError, InputLabel } from './InputLabeling'
import { ItemListRow } from './ItemListRow'
import { OptionIcon } from './OptionIcon'
import { PopoverPanel } from './Popover'
import { LoadingIndicator } from './Spinner'

export type MultiSelectOption = ComboboxSelectableOption
export type MultiSelectValue = string | number
export type MultiSelectGroup = Omit<NormalizedGroup, 'options'> & { options: NormalizedSelectable[] }
export type MultiSelectOptions = Array<MultiSelectOption | ComboboxGroupedOption>

export interface MultiSelectSlotProps {
  open: boolean
  disabled: boolean
  query: string
  selectedOptions: NormalizedSelectable[]
  clear: () => void
  setOpen: (open: boolean) => void
}

export interface MultiSelectSearchSlotProps {
  query: string
  setQuery: (value: string) => void
  disabled: boolean
  focus: (options?: FocusOptions) => void
}

export interface MultiSelectHandle {
  clear: () => void
  focus: (options?: FocusOptions) => void
}

export interface MultiSelectProps extends InputLabelingProps {
  value?: MultiSelectValue[]
  onChange?: (values: MultiSelectValue[]) => void
  onSelectedOptionsChange?: (options: MultiSelectOption[]) => void
  options?: MultiSelectOptions
  variant?: SelectionVariant
  size?: SelectionSize
  placeholder?: string
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  query?: string
  onQueryChange?: (query: string) => void
  hideSearch?: boolean
  loading?: boolean
  filterable?: boolean
  emptyText?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  className?: string
  handleRef?: Ref<MultiSelectHandle>
  labelSlot?: ReactNode | ((props: { required: boolean }) => ReactNode)
  descriptionSlot?: ReactNode
  trigger?: (props: MultiSelectSlotProps) => ReactNode
  prefix?: (props: MultiSelectSlotProps) => ReactNode
  suffix?: (props: MultiSelectSlotProps) => ReactNode
  summary?: (props: MultiSelectSlotProps & { summary: string }) => ReactNode
  footer?: (props: MultiSelectSlotProps & { selectAll: () => void }) => ReactNode
  searchPrefix?: (props: MultiSelectSearchSlotProps) => ReactNode
  searchSuffix?: (props: MultiSelectSearchSlotProps) => ReactNode
  item?: (props: ComboboxItemSlotProps) => ReactNode
  itemPrefix?: (props: ComboboxItemSlotProps) => ReactNode
  itemLabel?: (props: ComboboxItemSlotProps) => ReactNode
  itemSuffix?: (props: ComboboxItemSlotProps) => ReactNode
  itemSlots?: Record<string, (props: ComboboxItemSlotProps) => ReactNode>
  groupLabel?: (props: { group: MultiSelectGroup }) => ReactNode
  empty?: (props: { query: string }) => ReactNode
}

const NO_VALUES: MultiSelectValue[] = []

export function MultiSelect({
  value,
  onChange,
  onSelectedOptionsChange,
  options = [],
  variant = 'subtle',
  size = 'sm',
  placeholder = 'Select option',
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  query: controlledQuery,
  onQueryChange,
  hideSearch = false,
  loading = false,
  filterable = true,
  emptyText = 'No results',
  side = 'bottom',
  align = 'start',
  offset = 4,
  className,
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
  summary,
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
}: MultiSelectProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [internalQuery, setInternalQuery] = useState('')
  const [hasTypedSinceOpen, setHasTypedSinceOpen] = useState(false)
  const [triggerNode, setTriggerNode] = useState<HTMLButtonElement | null>(null)
  const [searchNode, setSearchNode] = useState<HTMLInputElement | null>(null)
  const [anchorNode, setAnchorNode] = useState<HTMLDivElement | null>(null)
  const open = controlledOpen ?? internalOpen
  const isQueryBound = controlledQuery !== undefined
  const query = controlledQuery ?? internalQuery
  const selectedValues = Array.isArray(value) ? value : NO_VALUES

  const { motion, onPointerDown, classifyOpen } = usePopoverMotion()
  const labeling = useInputLabeling({ label, description, error, required, id }, { size, variant, disabled })
  const hasLabeling = Boolean(label || description || labeling.hasError || labelSlot || descriptionSlot)

  const [previousOpen, setPreviousOpen] = useState(open)
  if (previousOpen !== open) {
    setPreviousOpen(open)
    if (isQueryBound) {
      setHasTypedSinceOpen(query !== '')
    } else {
      setInternalQuery('')
      setHasTypedSinceOpen(false)
    }
  }

  const typedQuery = hasTypedSinceOpen ? query : ''

  const normalizedGroups = useMemo<MultiSelectGroup[]>(
    () =>
      normalizeComboboxOptions(options as never).map((group) => ({
        ...group,
        options: group.options.filter(isSelectableItem),
      })),
    [options],
  )
  const allOptions = useMemo(() => normalizedGroups.flatMap((group) => group.options), [normalizedGroups])

  const selectedOptions = useMemo(
    () =>
      selectedValues
        .map((current) => allOptions.find((option) => option.value === current) ?? null)
        .filter((option): option is NormalizedSelectable => Boolean(option)),
    [selectedValues, allOptions],
  )

  const triggerSummary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? (selectedOptions[0]?.label ?? placeholder)
        : `${selectedOptions.length} selected`
  const singleSelected = selectedOptions.length === 1 ? (selectedOptions[0] ?? null) : null
  const sizingText = [placeholder, `${Math.max(allOptions.length, 1)} selected`].join('\n')

  const filteredGroups = useMemo(
    () =>
      filterGroups<NormalizedSelectable, MultiSelectGroup>({
        groups: normalizedGroups,
        open,
        hasTypedSinceOpen,
        query,
        filterable,
        matches: (item, q) => matchesSelectable(item, q),
      }),
    [normalizedGroups, open, hasTypedSinceOpen, query, filterable],
  )

  const flatItems = useMemo(() => filteredGroups.flatMap((group) => group.options), [filteredGroups])
  const showEmpty = !loading && flatItems.length === 0
  const selectableOptions = allOptions.filter((option) => !option.disabled)
  const allSelected =
    selectableOptions.length > 0 && selectableOptions.every((option) => selectedValues.includes(option.value))

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
      if (disabled) return
      setInternalQuery(next)
      onQueryChange?.(next)
      setHasTypedSinceOpen(next !== '')
    },
    [disabled, onQueryChange],
  )

  const commit = useCallback(
    (values: MultiSelectValue[]) => {
      onChange?.(values)
      onSelectedOptionsChange?.(
        values
          .map((current) => allOptions.find((option) => option.value === current) ?? null)
          .filter((option): option is NormalizedSelectable => Boolean(option)),
      )
    },
    [allOptions, onChange, onSelectedOptionsChange],
  )

  const clear = useCallback(() => commit([]), [commit])
  const selectAll = useCallback(
    () => commit(selectableOptions.map((option) => option.value)),
    [commit, selectableOptions],
  )

  const toggle = (option: NormalizedSelectable) => {
    if (option.disabled) return
    commit(
      selectedValues.includes(option.value)
        ? selectedValues.filter((current) => current !== option.value)
        : [...selectedValues, option.value],
    )
  }

  const downshift = useCombobox<NormalizedSelectable>({
    items: flatItems,
    isOpen: open,
    inputValue: query,
    selectedItem: null,
    itemToString: (item) => item?.label ?? '',
    isItemDisabled: (item) => Boolean(item.disabled),
    defaultHighlightedIndex: 0,
    onIsOpenChange: ({ isOpen }) => setOpen(Boolean(isOpen)),
    onInputValueChange: ({ inputValue, type }) => {
      if (type !== useCombobox.stateChangeTypes.InputChange) return
      setQuery(inputValue ?? '')
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) toggle(selectedItem)
    },
    stateReducer: (state, { type, changes }) => {
      const { stateChangeTypes } = useCombobox
      if (type === stateChangeTypes.ItemClick || type === stateChangeTypes.InputKeyDownEnter) {
        return { ...changes, isOpen: true, inputValue: state.inputValue, highlightedIndex: state.highlightedIndex }
      }
      if (type === stateChangeTypes.InputClick) return { ...changes, isOpen: state.isOpen }
      if (type === stateChangeTypes.InputBlur) return { ...changes, isOpen: state.isOpen, inputValue: state.inputValue }
      return changes
    },
  })

  const focus = useCallback(
    (focusOptions?: FocusOptions) => {
      const target = triggerNode ?? searchNode
      target?.focus(focusOptions)
    },
    [triggerNode, searchNode],
  )

  useImperativeHandle(handleRef, () => ({ clear, focus }), [clear, focus])

  const slotProps: MultiSelectSlotProps = { open, disabled, query: typedQuery, selectedOptions, clear, setOpen }
  const searchSlotProps: MultiSelectSearchSlotProps = {
    query: typedQuery,
    setQuery,
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
    triggerBaseClassesFocusVisible,
    triggerSizeClasses(size),
    inputFontSizeClasses(size),
    triggerVariantClasses(variant, disabled),
  )

  const itemContext = (item: NormalizedSelectable): ComboboxItemSlotProps => ({
    item,
    query: typedQuery,
    selected: selectedValues.includes(item.value),
  })

  const renderItemBody = (item: NormalizedSelectable) => {
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
          <span className="flex items-center gap-2">
            <Checkbox
              value={context.selected}
              disabled={item.disabled}
              size="sm"
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none"
              onChange={() => undefined}
            />
            {itemPrefix ? (
              itemPrefix(context)
            ) : item.slots?.prefix ? (
              item.slots.prefix(context)
            ) : item.icon ? (
              <OptionIcon icon={item.icon} />
            ) : null}
          </span>
        }
        suffix={itemSuffix ? itemSuffix(context) : item.slots?.suffix?.(context)}
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

  const searchInputProps = downshift.getInputProps(
    {
      id: `${labeling.inputId}-search-input`,
      disabled,
      placeholder,
      autoComplete: 'off',
      'data-slot': 'input',
    } as never,
    { suppressRefError: true },
  ) as Record<string, unknown> & { ref?: (node: HTMLInputElement | null) => void }
  const { ref: downshiftSearchRef, ...searchRest } = searchInputProps

  const menuProps = downshift.getMenuProps({}, { suppressRefError: true })

  const control = (
    <RadixPopover.Anchor asChild>
      <div ref={setAnchorNode} className="contents" onPointerDown={onPointerDown} onClick={() => setOpen(!open)}>
        {trigger ? (
          trigger(slotProps)
        ) : (
          <button
            ref={setTriggerNode}
            type="button"
            className={cn(
              triggerClasses,
              'justify-between',
              disabled && 'cursor-not-allowed',
              hasLabeling ? 'w-full' : className,
            )}
            disabled={disabled}
            data-slot="trigger"
            data-state={open ? 'open' : 'closed'}
            data-variant={variant}
            data-size={size}
            data-disabled={disabled ? '' : undefined}
            data-invalid={labeling.hasError ? 'true' : undefined}
            data-required={required ? 'true' : undefined}
            id={labeling.inputId}
            aria-haspopup="listbox"
            aria-expanded={open}
            {...ariaProps}
          >
            {prefix ? (
              prefix(slotProps)
            ) : singleSelected && itemPrefix ? (
              itemPrefix({ item: singleSelected, query: '', selected: true })
            ) : singleSelected?.icon ? (
              <OptionIcon icon={singleSelected.icon} />
            ) : null}
            <span className="grid min-w-0 flex-1 text-left font-normal">
              <span
                className={cn(
                  'col-start-1 row-start-1 max-w-full truncate',
                  selectedOptions.length === 0 && 'text-ink-gray-4',
                )}
              >
                {summary ? summary({ ...slotProps, summary: triggerSummary }) : triggerSummary}
              </span>
              {!summary && (
                <span
                  aria-hidden="true"
                  className="multi-select-trigger-sizer col-start-1 row-start-1"
                  data-width-text={sizingText}
                />
              )}
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
    </RadixPopover.Anchor>
  )

  const results = (
    <div {...menuProps} className="flex max-h-60 flex-col overflow-auto p-1">
      {loading && hideSearch ? (
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
              const itemProps = downshift.getItemProps({ item, index, disabled: item.disabled } as never)
              const selected = selectedValues.includes(item.value)
              return (
                <div
                  key={String(item.value)}
                  {...itemProps}
                  data-slot="item"
                  data-size={size}
                  data-state={selected ? 'checked' : 'unchecked'}
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
      {!hideSearch && (
        <div data-slot="search" className="flex items-center gap-2 border-b border-outline-gray-1 px-3">
          {searchPrefix?.(searchSlotProps)}
          <input
            {...searchRest}
            ref={(node) => {
              setSearchNode(node)
              downshiftSearchRef?.(node)
            }}
            className="min-w-0 flex-1 border-0 bg-transparent px-0 py-2 text-base text-ink-gray-8 outline-none placeholder:text-ink-gray-4 focus:ring-0"
          />
          {loading && <LoadingIndicator className="size-4 shrink-0 text-ink-gray-5" />}
          {searchSuffix?.(searchSlotProps)}
        </div>
      )}
      {results}
      {footer ? (
        <div data-slot="footer">{footer({ ...slotProps, selectAll })}</div>
      ) : (
        <div
          data-slot="footer"
          className="flex items-center justify-between gap-2 border-t border-outline-gray-1 px-2 py-1.5"
        >
          {selectedValues.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear All
            </Button>
          )}
          {!allSelected && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={selectAll}>
              Select All
            </Button>
          )}
        </div>
      )}
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
          className="z-[100] min-w-(--radix-popover-trigger-width)"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            const target = event.target as Node | null
            if (target && anchorNode?.contains(target)) event.preventDefault()
          }}
        >
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
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )

  if (!hasLabeling) return <div className="contents">{root}</div>

  return (
    <div className={cn('space-y-1.5', className)}>
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
