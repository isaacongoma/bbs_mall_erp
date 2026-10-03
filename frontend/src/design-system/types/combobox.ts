import type { ReactNode } from 'react'
import type { IconSource } from '../icons'

export type ComboboxOptionValue = string | number

export interface ComboboxItemSlotProps {
  item: ComboboxSelectableOption | ComboboxCustomOption
  query: string
  selected: boolean
}

export interface ComboboxItemSlots {
  prefix?: (props: ComboboxItemSlotProps) => ReactNode
  label?: (props: ComboboxItemSlotProps) => ReactNode
  suffix?: (props: ComboboxItemSlotProps) => ReactNode
  item?: (props: ComboboxItemSlotProps) => ReactNode
}

export interface ComboboxSelectableOption {
  type?: 'option'
  label: string
  value: ComboboxOptionValue
  icon?: IconSource
  description?: string
  disabled?: boolean
  slot?: string
  slots?: ComboboxItemSlots
  [key: string]: unknown
}

export interface ComboboxCustomOptionContext {
  query: string
}

export interface ComboboxCustomOption {
  type: 'custom'
  key: string
  label: string
  icon?: IconSource
  description?: string
  disabled?: boolean
  slot?: string
  slots?: ComboboxItemSlots
  onClick: (context: ComboboxCustomOptionContext) => void
  keepOpen?: boolean
  condition?: (context: ComboboxCustomOptionContext) => boolean
  [key: string]: unknown
}

export type ComboboxSimpleOption = string | ComboboxSelectableOption | ComboboxCustomOption

export interface ComboboxGroupedOption {
  key?: string | number
  group: string
  hideLabel?: boolean
  options: ComboboxSimpleOption[]
}

export type ComboboxOption = ComboboxSimpleOption | ComboboxGroupedOption

export type NormalizedSelectable = ComboboxSelectableOption & { type: 'option' }
export type NormalizedCustom = ComboboxCustomOption & { type: 'custom' }
export type NormalizedItem = NormalizedSelectable | NormalizedCustom

export interface NormalizedGroup {
  key?: string | number
  group: string
  hideLabel?: boolean
  options: NormalizedItem[]
}
