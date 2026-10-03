import { matchesByLabelOrValue } from './selection'
import type {
  ComboboxGroupedOption,
  ComboboxOption,
  ComboboxSimpleOption,
  NormalizedCustom,
  NormalizedGroup,
  NormalizedItem,
  NormalizedSelectable,
} from '../types/combobox'

export function isGroupedOption(option: ComboboxOption): option is ComboboxGroupedOption {
  return typeof option === 'object' && option !== null && 'group' in option
}

export const isCustomItem = (item: NormalizedItem): item is NormalizedCustom => item.type === 'custom'
export const isSelectableItem = (item: NormalizedItem): item is NormalizedSelectable => item.type === 'option'

function normalizeSimple(option: ComboboxSimpleOption | null | undefined): NormalizedItem | null {
  if (!option) return null
  if (typeof option === 'string') return { type: 'option', label: option, value: option }
  if (option.type === 'custom') return { ...option, type: 'custom' }
  if (option.value === undefined || option.value === null) return null
  return { ...option, type: 'option' }
}

export function normalizeComboboxOptions(options: ComboboxOption[]): NormalizedGroup[] {
  const groups: NormalizedGroup[] = []
  let pending: NormalizedItem[] = []

  const flush = () => {
    if (!pending.length) return
    groups.push({ key: `__ungrouped__${groups.length}`, group: '', hideLabel: true, options: pending })
    pending = []
  }

  options.forEach((option, index) => {
    if (isGroupedOption(option)) {
      flush()
      const normalized = option.options.map(normalizeSimple).filter((item): item is NormalizedItem => Boolean(item))
      if (!normalized.length) return
      groups.push({
        key: option.key ?? `group-${index}`,
        group: option.group,
        hideLabel: option.hideLabel,
        options: normalized,
      })
      return
    }
    const item = normalizeSimple(option)
    if (item) pending.push(item)
  })

  flush()
  return groups
}

export function matchesSelectable(item: NormalizedSelectable, query: string): boolean {
  return matchesByLabelOrValue(item, query)
}

export function customOptionIsVisible(item: NormalizedCustom, query: string): boolean {
  return item.condition ? item.condition({ query }) : true
}

export function matchesCustom(item: NormalizedCustom, query: string): boolean {
  if (item.condition) return true
  if (!query) return true
  return item.label.toLowerCase().includes(query.toLowerCase())
}

export const comboboxInputClasses =
  'min-w-0 flex-1 border-0 bg-transparent p-0 text-ink-gray-8 outline-none ring-0 placeholder:text-ink-gray-4 focus:border-0 focus:outline-none focus:ring-0'
