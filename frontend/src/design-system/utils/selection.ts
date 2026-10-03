import type { ItemListRowSize } from '../components/ItemListRow'
import type { SelectionSize, SelectionVariant } from '../types/selection'

export function triggerSizeClasses(size: SelectionSize): string {
  return {
    sm: 'min-h-7 rounded px-2',
    md: 'min-h-8 rounded px-2.5',
    lg: 'min-h-10 rounded-md px-3',
    xl: 'min-h-10 rounded-md px-3',
  }[size]
}

export function inputFontSizeClasses(size: SelectionSize): string {
  return { sm: 'text-base', md: 'text-base', lg: 'text-lg', xl: 'text-2xl' }[size]
}

export function itemRootSizeClasses(size: SelectionSize): string {
  return { sm: 'min-h-7', md: 'min-h-8', lg: 'min-h-10', xl: 'min-h-10' }[size]
}

export function toItemListSize(size: SelectionSize): ItemListRowSize {
  return size
}

export function triggerVariantClasses(variant: SelectionVariant, disabled: boolean): string {
  if (disabled) {
    return [
      'cursor-not-allowed border text-ink-gray-4',
      variant !== 'ghost' ? 'bg-surface-gray-1' : '',
      variant === 'outline' ? 'border-outline-gray-2' : 'border-transparent',
    ].join(' ')
  }
  return {
    subtle:
      'border border-(--surface-gray-2) bg-surface-gray-2 hover:border-outline-elevation-2 hover:bg-surface-gray-3',
    outline: 'border border-outline-gray-2 bg-surface-base hover:border-outline-gray-3',
    ghost: 'border border-transparent bg-transparent hover:bg-surface-gray-3 focus-within:bg-surface-gray-3',
  }[variant]
}

export const triggerBaseClassesFocusVisible =
  'relative inline-flex items-center gap-2 text-left text-ink-gray-7 transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=open]:focus-ring'

export const triggerBaseClassesFocusWithin =
  'relative inline-flex items-center gap-2 text-left text-ink-gray-7 outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:focus-ring data-[state=open]:focus-ring'

export const itemClasses =
  'select-none rounded border-0 text-base text-ink-gray-9 transition-colors duration-100 ease-out data-[disabled]:text-ink-gray-4 data-[highlighted]:bg-surface-alpha-gray-2 data-[state=checked]:bg-surface-gray-3 data-[highlighted]:data-[state=checked]:bg-surface-gray-4'

export function matchesByLabelOrValue(item: { label: string; value: string | number }, query: string): boolean {
  const normalized = query.toLowerCase()
  if (!normalized) return true
  return item.label.toLowerCase().includes(normalized) || String(item.value).toLowerCase().includes(normalized)
}

export interface FilterableGroup<TItem> {
  options: TItem[]
}

export function filterGroups<TItem, TGroup extends FilterableGroup<TItem>>(params: {
  groups: TGroup[]
  open: boolean
  hasTypedSinceOpen: boolean
  query: string
  matches: (item: TItem, query: string) => boolean
  alwaysMatch?: (item: TItem) => boolean
  filterable?: boolean
}): TGroup[] {
  const alwaysMatch = params.alwaysMatch ?? (() => true)
  const filterByTypedQuery = (params.filterable ?? true) && params.open && params.hasTypedSinceOpen

  return params.groups
    .map((group) => ({
      ...group,
      options: group.options.filter((item) => {
        if (!alwaysMatch(item)) return false
        if (!filterByTypedQuery) return true
        return params.matches(item, params.query)
      }),
    }))
    .filter((group) => group.options.length > 0)
}

export function emptyValueMapper<T extends { value: unknown }>(allOptions: readonly T[], prefix: string) {
  const toInternal = (option: T): T['value'] | string =>
    option.value !== '' ? option.value : `${prefix}${allOptions.indexOf(option)}`

  const toExternal = <V>(internal: V): T['value'] | V => {
    const match = allOptions.find((option) => toInternal(option) === internal)
    return match ? match.value : internal
  }

  return { toInternal, toExternal }
}
