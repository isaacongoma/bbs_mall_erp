import type { ComponentType, ReactNode } from 'react'
import type { To } from 'react-router-dom'
import type { IconSource } from '../icons'

export type MenuTheme = 'gray' | 'red'

export interface MenuItemSlotProps {
  item: MenuOption
  close: () => void
  selected: boolean
}

export interface MenuGroupSlotProps {
  group: MenuGroupOption
}

export interface MenuItemSlots {
  prefix?: (props: MenuItemSlotProps) => ReactNode
  label?: (props: MenuItemSlotProps) => ReactNode
  suffix?: (props: MenuItemSlotProps) => ReactNode
  item?: (props: MenuItemSlotProps) => ReactNode
}

export interface MenuBaseOption {
  icon?: IconSource | null
  description?: string
  selected?: boolean
  disabled?: boolean
  theme?: MenuTheme
  slot?: string
  slots?: MenuItemSlots
  condition?: () => boolean
  value?: string | number
  [key: string]: unknown
}

export interface MenuActionOption extends MenuBaseOption {
  label: string
  route?: To
  onClick?: (event: Event) => void
}

export interface MenuSwitchOption extends MenuBaseOption {
  label: string
  switch: true
  switchValue?: boolean
  onClick?: (value: boolean) => void
}

export interface MenuSubmenuOption extends MenuBaseOption {
  label: string
  submenu: MenuOptions
}

export interface MenuComponentOption extends MenuBaseOption {
  component: ComponentType<{ active?: boolean }>
  label?: string
}

export interface MenuGroupOption {
  key?: string | number
  group: string
  options?: MenuOption[]
  items?: MenuOption[]
  hideLabel?: boolean
  theme?: MenuTheme
}

export type MenuOption = MenuActionOption | MenuSwitchOption | MenuSubmenuOption | MenuComponentOption

export type MenuItem = MenuOption | MenuGroupOption

export type MenuOptions = MenuItem[]

export interface NormalizedMenuGroup extends MenuGroupOption {
  options: MenuOption[]
}

export interface MenuRenderers {
  item?: (props: MenuItemSlotProps) => ReactNode
  itemPrefix?: (props: MenuItemSlotProps) => ReactNode
  itemLabel?: (props: MenuItemSlotProps) => ReactNode
  itemSuffix?: (props: MenuItemSlotProps) => ReactNode
  groupLabel?: (props: MenuGroupSlotProps) => ReactNode
  empty?: () => ReactNode
  named?: Record<string, ((props: MenuItemSlotProps) => ReactNode) | undefined>
}
