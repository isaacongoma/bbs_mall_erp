import { __ } from '@/core/i18n'
import { Button, Dropdown, type DropdownGroupOption, type DropdownOption } from '@/design-system'
import { useIsMobileView } from '../hooks/useIsMobileView'

export interface CustomActionItem {
  label: string
  onClick: (close: () => void) => void
  icon?: string
}

export interface CustomAction {
  label?: string
  onClick?: (close: () => void) => void
  icon?: string
  group?: string
  buttonLabel?: string
  hideLabel?: boolean
  items?: CustomActionItem[]
}

export interface CustomActionsProps {
  actions?: CustomAction[]
  close?: () => void
}

function bindItems(items: CustomActionItem[] | undefined, close: () => void): DropdownOption[] {
  return (items ?? []).map((item) => ({ ...item, onClick: () => item.onClick(close) })) as DropdownOption[]
}

export function CustomActions({ actions = [], close = () => undefined }: CustomActionsProps) {
  const isMobileView = useIsMobileView()

  const normalActions = actions.filter((action) => !action.group)

  const groupedWithLabel: Array<{ label: string; actions: DropdownGroupOption[] }> = []
  actions
    .filter((action) => action.buttonLabel && action.group)
    .forEach((action) => {
      const bound: DropdownGroupOption = {
        group: action.group as string,
        hideLabel: action.hideLabel,
        items: bindItems(action.items, close),
      }
      const existing = groupedWithLabel.find((entry) => entry.label === action.buttonLabel)
      if (existing) existing.actions.push(bound)
      else groupedWithLabel.push({ label: action.buttonLabel as string, actions: [bound] })
    })

  const groupedActions: DropdownGroupOption[] = []
  if (isMobileView && normalActions.length) {
    groupedActions.push({
      group: __('Actions'),
      hideLabel: true,
      items: normalActions.map((action) => ({
        label: action.label as string,
        onClick: () => action.onClick?.(close),
        icon: action.icon,
      })) as DropdownOption[],
    })
  }
  if (isMobileView) groupedWithLabel.forEach((group) => groupedActions.push(...group.actions))

  actions
    .filter((action) => action.group && !action.buttonLabel)
    .forEach((action) => {
      groupedActions.push({
        group: action.group as string,
        hideLabel: action.hideLabel,
        items: bindItems(action.items, close),
      })
    })

  return (
    <>
      {normalActions.length > 0 &&
        !isMobileView &&
        normalActions.map((action) => (
          <Button
            key={action.label}
            label={action.label}
            iconLeft={action.icon ? `lucide-${action.icon}` : undefined}
            onClick={() => action.onClick?.(close)}
          />
        ))}
      {groupedActions.length > 0 && (
        <Dropdown options={groupedActions}>
          <Button icon="lucide-more-horizontal" />
        </Dropdown>
      )}
      {groupedWithLabel.length > 0 &&
        !isMobileView &&
        groupedWithLabel.map((group) => (
          <div key={group.label}>
            <Dropdown options={group.actions}>
              {({ open }) => (
                <Button label={group.label} iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'} />
              )}
            </Dropdown>
          </div>
        ))}
    </>
  )
}
