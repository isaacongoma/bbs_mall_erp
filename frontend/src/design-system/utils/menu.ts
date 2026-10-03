import type {
  MenuComponentOption,
  MenuGroupOption,
  MenuItem,
  MenuOption,
  MenuOptions,
  MenuSubmenuOption,
  MenuSwitchOption,
  MenuTheme,
  NormalizedMenuGroup,
} from '../types/menu'

export const menuClasses = {
  content:
    'menu-content min-w-40 divide-y divide-outline-elevation-2 rounded-lg bg-surface-elevation-2 shadow-2xl ring-1 ring-black/5 focus:outline-none',
  group: 'p-1.5',
  groupLabel: 'flex h-7 items-center px-2 text-sm font-medium text-ink-gray-4',
  itemIcon: 'size-4 shrink-0',
  itemIconPlaceholder: 'size-4 shrink-0',
  chevronIcon: 'size-4 shrink-0',
  menuItem:
    'cursor-pointer rounded outline-none data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed',
} as const

export function isMenuGroupOption(item: MenuItem): item is MenuGroupOption {
  return 'group' in item && ('options' in item || 'items' in item)
}

export function isMenuSwitchOption(item: MenuOption): item is MenuSwitchOption {
  return (item as MenuSwitchOption).switch === true
}

export function isMenuSubmenuOption(item: MenuOption): item is MenuSubmenuOption {
  return Array.isArray((item as MenuSubmenuOption).submenu)
}

export function isMenuComponentOption(item: MenuOption): item is MenuComponentOption {
  return 'component' in item && Boolean((item as MenuComponentOption).component)
}

function shouldRenderOption(option: MenuOption): boolean {
  return option.condition ? option.condition() : true
}

export function normalizeMenuOption(option: MenuOption): MenuOption {
  return { ...option, theme: option.theme ?? 'gray', selected: Boolean(option.selected) }
}

function normalizeGroupItems(items: MenuOption[]): MenuOption[] {
  return (items || []).filter(Boolean).filter(shouldRenderOption).map(normalizeMenuOption)
}

export function normalizeMenuOptions(options: MenuOptions = []): NormalizedMenuGroup[] {
  const groups: NormalizedMenuGroup[] = []
  let currentGroup: NormalizedMenuGroup | null = null
  let implicitGroupIndex = 0

  const flushCurrentGroup = () => {
    if (currentGroup && currentGroup.options.length) groups.push(currentGroup)
    currentGroup = null
  }

  options.forEach((item, index) => {
    if (!item) return

    if (isMenuGroupOption(item)) {
      flushCurrentGroup()
      const visibleItems = normalizeGroupItems(item.options ?? item.items ?? [])
      if (!visibleItems.length) return
      const rest: MenuGroupOption = { ...item }
      delete rest.items
      groups.push({ ...rest, key: item.key ?? index, options: visibleItems })
      return
    }

    if (!shouldRenderOption(item)) return

    if (!currentGroup) {
      currentGroup = { key: `implicit-${implicitGroupIndex++}`, group: '', hideLabel: true, options: [] }
    }
    currentGroup.options.push(normalizeMenuOption(item))
  })

  flushCurrentGroup()
  return groups
}

export function groupHasIcons(group: NormalizedMenuGroup): boolean {
  return group.options.some((item) => Boolean(item.icon))
}

export function getMenuIconColor(item: { disabled?: boolean; theme?: MenuTheme }): string {
  if (item.disabled) return 'text-ink-gray-4'
  return item.theme === 'red' ? 'text-ink-red-6' : 'text-ink-gray-6'
}

export function getMenuTextColor(item: { disabled?: boolean; theme?: MenuTheme }): string {
  if (item.disabled) return 'text-ink-gray-4'
  return item.theme === 'red' ? 'text-ink-red-6' : 'text-ink-gray-7'
}

export function getMenuBackgroundColor(item: { theme?: MenuTheme }): string {
  if (item.theme === 'red') {
    return 'focus:bg-surface-red-3 data-[highlighted]:bg-surface-red-3 data-[state=open]:bg-surface-red-3'
  }
  return [
    'focus:bg-surface-alpha-gray-2 data-[highlighted]:bg-surface-alpha-gray-2 data-[state=open]:bg-surface-alpha-gray-2',
    'data-[state=checked]:bg-surface-gray-3',
    'data-[highlighted]:data-[state=checked]:bg-surface-gray-4',
  ].join(' ')
}
