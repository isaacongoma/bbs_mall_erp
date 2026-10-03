import { useMemo } from 'react'
import { __ } from '@/core/i18n'
import { getModules } from '@/core/modules/registry'
import { router } from '@/core/navigation'
import {
  Dropdown,
  cn,
  type DropdownGroupOption as MenuGroupOption,
  type DropdownOption as MenuOption,
  type DropdownOptions as MenuOptions,
} from '@/design-system'
import { AppsIcon } from '@/shared/components/Icons'
import { useSession } from '@/shared/hooks/useSession'
import { useUsers } from '@/shared/hooks/useUsers'
import { isMobileView, useUiStore } from '@/shared/stores/uiStore'
import { useSettings } from '../hooks/useSettings'
import { BrandLogo } from './BrandLogo'
import { SvgHtmlIcon } from '@/shared/components/SvgHtmlIcon'

export interface UserDropdownProps {
  isCollapsed?: boolean
}

interface DropdownItemRecord {
  name1?: string
  label: string
  icon?: string
  hidden?: boolean
  type?: string
  route?: string
  is_standard?: boolean
  open_in_new_window?: boolean
}

function resolveIcon(icon: string | undefined): MenuOption['icon'] {
  const value = icon || 'external-link'
  if (value.startsWith('<svg')) return () => <SvgHtmlIcon html={value} />
  return value
}

function moduleSwitcherItems(): MenuOptions {
  return getModules()
    .filter((module) => module.navigation?.length)
    .map((module) => {
      const first = [...(module.navigation ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]
      return {
        label: __(module.label),
        onClick: () => {
          if (first) router.push(first.to)
        },
      }
    })
}

export function UserDropdown({ isCollapsed = false }: UserDropdownProps) {
  const { settings, brand } = useSettings()
  const { logout } = useSession()
  const { getUser } = useUsers()
  const setUi = useUiStore((state) => state.set)
  const user = getUser()
  const dropdownItems = settings?.dropdown_items as DropdownItemRecord[] | undefined

  const options = useMemo<MenuOptions>(() => {
    if (!dropdownItems) return []

    const standardItem = (item: DropdownItemRecord): MenuOption | null => {
      const icon = resolveIcon(item.icon)
      switch (item.name1) {
        case 'app_selector':
          return { icon: AppsIcon, label: __(item.label), submenu: moduleSwitcherItems() }
        case 'settings':
          return {
            icon,
            label: __(item.label),
            onClick: () => setUi({ showSettings: true }),
            condition: () => !isMobileView(),
          }
        case 'about':
          return { icon, label: __(item.label), onClick: () => setUi({ showAboutModal: true }) }
        case 'logout':
          return { icon, label: __(item.label), onClick: () => logout() }
        default:
          return null
      }
    }

    const itemOption = (item: DropdownItemRecord): MenuOption | null => {
      if (item.is_standard) return standardItem(item)
      return {
        icon: resolveIcon(item.icon),
        label: __(item.label),
        onClick: () => window.open(item.route, item.open_in_new_window ? '_blank' : ''),
      }
    }

    const groups: MenuGroupOption[] = [{ group: 'Dropdown Items', hideLabel: true, items: [] }]
    for (const item of dropdownItems) {
      if (item.hidden) continue
      if (item.type !== 'Separator') {
        const option = itemOption(item)
        if (option) groups[groups.length - 1]!.items!.push(option)
      } else {
        groups.push({ group: '', hideLabel: true, items: [] })
      }
    }
    return groups
  }, [dropdownItems, logout, setUi])

  return (
    <Dropdown options={options}>
      {({ open }) => (
        <button
          className={cn(
            'flex h-12 items-center rounded-md py-2 duration-300 ease-in-out',
            isCollapsed
              ? 'w-auto px-0'
              : open
                ? 'w-full bg-surface-elevation-3 px-2 shadow-sm'
                : 'w-full px-2 hover:bg-surface-gray-2',
          )}
        >
          <BrandLogo brand={brand} className="h-8 max-w-16 shrink-0" />
          <div
            className={cn(
              'flex flex-1 flex-col truncate text-left duration-300 ease-in-out',
              isCollapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-2 w-auto opacity-100',
            )}
          >
            <div className="truncate text-base-medium leading-none text-ink-gray-9">{__(brand.name || 'CRM')}</div>
            <div className="mt-1 truncate text-sm leading-none text-ink-gray-7">{user.full_name}</div>
          </div>
          <div
            className={cn(
              'duration-300 ease-in-out',
              isCollapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-2 w-auto opacity-100',
            )}
          >
            <span className="lucide-chevron-down size-4 text-ink-gray-5" aria-hidden="true" />
          </div>
        </button>
      )}
    </Dropdown>
  )
}
