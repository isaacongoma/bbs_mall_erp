import { useMemo } from 'react'
import { __ } from '@/core/i18n'
import { getModules } from '@/core/modules/registry'
import { router } from '@/core/navigation'
import {
  Avatar,
  Dropdown,
  cn,
  useTheme,
  type Theme,
  type DropdownGroupOption as MenuGroupOption,
  type DropdownOption as MenuOption,
  type DropdownOptions as MenuOptions,
} from '@/design-system'
import { AppsIcon } from '@/shared/components/Icons'
import { useSession } from '@/shared/hooks/useSession'
import { useUsers } from '@/shared/hooks/useUsers'
import { isMobileView, useUiStore } from '@/shared/stores/uiStore'
import { useSettings } from '../hooks/useSettings'
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

function ProfileHeader() {
  const { getUser } = useUsers()
  const user = getUser()
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Avatar image={user.user_image} label={user.full_name} size="lg" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base-medium text-ink-gray-9">{user.full_name}</span>
        <span className="truncate text-sm text-ink-gray-6">{user.email}</span>
      </div>
    </div>
  )
}

const themeChoices: { value: Theme; icon: string; label: string }[] = [
  { value: 'light', icon: 'lucide-sun', label: 'Light' },
  { value: 'dark', icon: 'lucide-moon', label: 'Dark' },
  { value: 'system', icon: 'lucide-monitor', label: 'System' },
]

function ThemeSwitcher() {
  const { currentTheme, setTheme } = useTheme()
  return (
    <div className="mx-1.5 my-1.5 flex items-center justify-around rounded-md bg-surface-gray-2 p-1" role="radiogroup">
      {themeChoices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          role="radio"
          aria-checked={currentTheme === choice.value}
          aria-label={__(choice.label)}
          onClick={(event) => {
            event.stopPropagation()
            setTheme(choice.value)
          }}
          className={cn(
            'flex h-8 flex-1 items-center justify-center rounded',
            currentTheme === choice.value ? 'bg-surface-elevation-2 shadow-sm' : 'hover:bg-surface-gray-3',
          )}
        >
          <span className={cn(choice.icon, 'size-4 text-ink-gray-7')} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

export function UserDropdown({ isCollapsed = false }: UserDropdownProps) {
  const { settings } = useSettings()
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
            label: __('App Settings'),
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

  const header = useMemo<MenuOption>(
    () => ({ component: () => <ProfileHeader />, onClick: (event: Event) => event.preventDefault() }),
    [],
  )
  const themeRow = useMemo<MenuOption>(
    () => ({ component: () => <ThemeSwitcher />, onClick: (event: Event) => event.preventDefault() }),
    [],
  )
  const account = useMemo<MenuOption>(
    () => ({
      icon: 'lucide-user',
      label: __('Account'),
      onClick: () => setUi({ showSettings: true, activeSettingsPage: 'Profile' }),
    }),
    [setUi],
  )

  const passkeys = useMemo<MenuOption>(
    () => ({ icon: 'lucide-key-round', label: __('Passkeys'), onClick: () => setUi({ showPasskeys: true }) }),
    [setUi],
  )

  const allOptions = useMemo<MenuOptions>(() => {
    const groups = options as MenuGroupOption[]
    const first = groups[0]
    const rest = groups.slice(1)
    return [
      { group: 'Profile', hideLabel: true, items: [header, themeRow] },
      { group: 'Account', hideLabel: true, items: [account, passkeys, ...(first?.items ?? [])] },
      ...rest,
    ]
  }, [options, header, themeRow, account, passkeys])

  return (
    <Dropdown options={allOptions} side="top" align="start" offset={8} matchTriggerWidth contentClassName="min-w-64">
      {({ open }) => (
        <button
          className={cn(
            'flex h-12 items-center rounded-md py-2 duration-300 ease-in-out',
            isCollapsed ? 'w-auto px-0' : 'w-full px-2',
            open ? 'bg-surface-blue-2' : 'hover:bg-surface-gray-2',
          )}
        >
          <Avatar image={user.user_image} label={user.full_name} size="md" className="shrink-0" />
          <div
            className={cn(
              'flex-1 truncate text-left text-base-medium text-ink-gray-9 duration-300 ease-in-out',
              isCollapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-2 w-auto opacity-100',
            )}
          >
            {user.full_name}
          </div>
          <span
            className={cn(
              'lucide-chevrons-up-down size-4 shrink-0 text-ink-gray-7 duration-300 ease-in-out',
              isCollapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-2 opacity-100',
            )}
            aria-hidden="true"
          />
        </button>
      )}
    </Dropdown>
  )
}
