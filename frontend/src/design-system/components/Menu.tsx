import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import { createElement, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, isEmojiIconString, isLucideIconString } from '../icons'
import { cn } from '../utils/cn'
import { ItemListRow } from './ItemListRow'
import { Switch } from './Switch'
import {
  getMenuBackgroundColor,
  getMenuIconColor,
  getMenuTextColor,
  groupHasIcons,
  isMenuComponentOption,
  isMenuSubmenuOption,
  isMenuSwitchOption,
  menuClasses,
  normalizeMenuOptions,
} from '../utils/menu'
import type { MenuOption, MenuRenderers, NormalizedMenuGroup } from '../types/menu'

interface MenuItemContentProps {
  item: MenuOption
  close: () => void
  reserveIconSpace: boolean
  renderers?: MenuRenderers
  trailing?: 'none' | 'submenu' | 'switch'
}

function renderIcon(item: MenuOption): ReactNode {
  const icon = item.icon
  if (!icon) return null
  const className = cn(menuClasses.itemIcon, getMenuIconColor(item))
  if (typeof icon === 'string' && isEmojiIconString(icon) && !isLucideIconString(icon)) {
    return (
      <span
        aria-hidden="true"
        className={cn(menuClasses.itemIcon, 'inline-flex items-center justify-center text-base leading-none')}
      >
        {icon}
      </span>
    )
  }
  if (typeof icon === 'string') return <Icon source={icon} className={className} hidden />
  return createElement(icon, { className })
}

function MenuItemContent({ item, close, reserveIconSpace, renderers, trailing = 'none' }: MenuItemContentProps) {
  const context = { item, close, selected: Boolean(item.selected) }
  const named = item.slot ? renderers?.named?.[`item-${item.slot}`] : undefined

  const prefix =
    renderers?.itemPrefix?.(context) ??
    item.slots?.prefix?.(context) ??
    renderIcon(item) ??
    (reserveIconSpace ? <div className={menuClasses.itemIconPlaceholder} /> : null)

  const label = named?.(context) ?? renderers?.itemLabel?.(context) ?? item.slots?.label?.(context) ?? (
    <div className="min-w-0">
      <div className={cn('truncate', getMenuTextColor(item))}>{item.label as string}</div>
      {item.description && <div className="truncate text-p-sm text-ink-gray-5">{item.description}</div>}
    </div>
  )

  const suffix =
    renderers?.itemSuffix?.(context) ??
    item.slots?.suffix?.(context) ??
    (trailing === 'switch' ? (
      <Switch
        className="ml-auto"
        labelClassName="cursor-pointer font-normal"
        disabled={item.disabled}
        value={Boolean((item as { switchValue?: boolean }).switchValue)}
        onChange={(value) => (item.onClick as ((value: boolean) => void) | undefined)?.(value)}
      />
    ) : trailing === 'submenu' ? (
      <Icon source="lucide-chevron-right" className={cn(menuClasses.chevronIcon, getMenuIconColor(item))} />
    ) : null)

  return (
    <ItemListRow
      selected={Boolean(item.selected)}
      disabled={item.disabled}
      prefix={prefix}
      suffix={suffix}
      className="bg-transparent data-[state=active]:bg-transparent"
    >
      {label}
    </ItemListRow>
  )
}

export interface MenuProps {
  groups: NormalizedMenuGroup[]
  close: () => void
  renderers?: MenuRenderers
}

export function Menu({ groups, close, renderers }: MenuProps) {
  const navigate = useNavigate()
  const hasVisibleItems = groups.some((group) => group.options.length)

  const handleSelect = (item: MenuOption, event: Event) => {
    if (item.route !== undefined) {
      void navigate(item.route as string)
      return
    }
    ;(item.onClick as ((event: Event) => void) | undefined)?.(event)
  }

  if (!hasVisibleItems) {
    return (
      <div data-slot="empty" className="p-1.5 text-base text-ink-gray-5">
        {renderers?.empty ? renderers.empty() : 'No options'}
      </div>
    )
  }

  return (
    <>
      {groups.map((group, groupIndex) => (
        <div key={group.key ?? group.group ?? groupIndex} data-slot="group" className={menuClasses.group}>
          {group.group && !group.hideLabel && (
            <RadixMenu.Label data-slot="group-label" className={menuClasses.groupLabel}>
              {renderers?.groupLabel ? renderers.groupLabel({ group }) : group.group}
            </RadixMenu.Label>
          )}

          {group.options.map((item, itemIndex) => {
            const key = item.value ?? (item.label as string | undefined) ?? itemIndex
            const reserve = groupHasIcons(group)
            const context = { item, close, selected: Boolean(item.selected) }

            if (isMenuSubmenuOption(item)) {
              return (
                <RadixMenu.Sub key={key}>
                  <RadixMenu.SubTrigger
                    data-slot="item"
                    data-disabled={item.disabled ? '' : undefined}
                    disabled={item.disabled}
                    className={cn(
                      menuClasses.menuItem,
                      getMenuBackgroundColor(item),
                      'data-[disabled]:cursor-not-allowed',
                    )}
                  >
                    <MenuItemContent
                      item={item}
                      close={close}
                      reserveIconSpace={reserve}
                      renderers={renderers}
                      trailing="submenu"
                    />
                  </RadixMenu.SubTrigger>
                  <RadixMenu.Portal>
                    <RadixMenu.SubContent data-slot="content" className={menuClasses.content} sideOffset={4}>
                      <Menu groups={normalizeMenuOptions(item.submenu)} close={close} renderers={renderers} />
                    </RadixMenu.SubContent>
                  </RadixMenu.Portal>
                </RadixMenu.Sub>
              )
            }

            if (isMenuSwitchOption(item)) {
              return (
                <div key={key} data-slot="item" data-disabled={item.disabled ? '' : undefined} className="rounded">
                  <MenuItemContent
                    item={item}
                    close={close}
                    reserveIconSpace={reserve}
                    renderers={renderers}
                    trailing="switch"
                  />
                </div>
              )
            }

            const customRow = renderers?.item?.(context) ?? item.slots?.item?.(context)
            if (customRow !== undefined && customRow !== null) {
              return (
                <RadixMenu.Item
                  key={key}
                  asChild
                  data-slot="item"
                  disabled={item.disabled}
                  className="data-[disabled]:cursor-not-allowed"
                  onSelect={(event) => handleSelect(item, event)}
                >
                  {customRow as React.ReactElement}
                </RadixMenu.Item>
              )
            }

            if (isMenuComponentOption(item)) {
              return (
                <RadixMenu.Item
                  key={key}
                  asChild
                  data-slot="item"
                  disabled={item.disabled}
                  className="data-[disabled]:cursor-not-allowed"
                  onSelect={(event) => handleSelect(item, event)}
                >
                  {createElement(item.component, { active: false })}
                </RadixMenu.Item>
              )
            }

            return (
              <RadixMenu.Item
                key={key}
                data-slot="item"
                data-state={item.selected ? 'checked' : undefined}
                disabled={item.disabled}
                className={cn('data-[disabled]:cursor-not-allowed', menuClasses.menuItem, getMenuBackgroundColor(item))}
                onSelect={(event) => handleSelect(item, event)}
              >
                <MenuItemContent item={item} close={close} reserveIconSpace={reserve} renderers={renderers} />
              </RadixMenu.Item>
            )
          })}
        </div>
      ))}
    </>
  )
}
