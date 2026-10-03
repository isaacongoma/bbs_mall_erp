import { Fragment, useMemo, type MouseEvent } from 'react'
import { Button } from '../../components/Button'
import { Tooltip, TooltipProvider } from '../../components/Tooltip'
import { useEditorVersion } from '../hooks/useEditorVersion'
import type { CommandMenuItem, MenuGroupItem, MenuItem } from '../menu'
import type { Editor } from '../types/editor'

export interface MenuItemsProps {
  editor: Editor | null
  items: MenuItem[]
  buttonSize?: 'xs' | 'sm'
}

type Separator = { type: 'separator' }

function isGroup(item: MenuItem): item is MenuGroupItem {
  return 'type' in item && item.type === 'group'
}

function isSeparator(item: MenuItem): item is Separator {
  return 'type' in item && item.type === 'separator'
}

function isComponentItem(
  item: MenuItem,
): item is CommandMenuItem & { component: NonNullable<CommandMenuItem['component']> } {
  return !('type' in item) && !!(item as CommandMenuItem).component
}

export function MenuItems({ editor, items, buttonSize }: MenuItemsProps) {
  useEditorVersion(editor)
  const size = buttonSize ?? 'xs'

  const isPressed = (item: CommandMenuItem) => !!editor && item.isActive?.(editor) === true
  const isItemDisabled = (item: CommandMenuItem) => !editor || item.isDisabled?.(editor) === true
  const labelOf = (item: CommandMenuItem) => (editor && item.getLabel ? item.getLabel(editor) : item.label)

  const visibleItems = useMemo<MenuItem[]>(() => {
    const result: MenuItem[] = []
    for (const item of items) {
      if (isSeparator(item)) {
        const last = result[result.length - 1]
        if (last && !isSeparator(last)) result.push(item)
      } else if (isGroup(item)) {
        const groupItems = item.items.filter((groupItem) => !editor || groupItem.isAvailable?.(editor) !== false)
        if (groupItems.length) result.push({ ...item, items: groupItems })
      } else if (!editor || item.isAvailable?.(editor) !== false) {
        result.push(item)
      }
    }
    const last = result[result.length - 1]
    if (last && isSeparator(last)) result.pop()
    return result
  }, [items, editor])

  const run = (item: CommandMenuItem, event?: MouseEvent) => {
    if (editor && !item.isDisabled?.(editor)) {
      item.action(editor, { event: event?.nativeEvent, trigger: event?.currentTarget as HTMLElement | undefined })
    }
  }

  return (
    <TooltipProvider>
      {visibleItems.map((item, index) => {
        const key = `${'label' in item ? item.label : item.type}-${index}`

        if (isSeparator(item)) {
          return (
            <span key={key} data-slot="menu-separator" className="mx-1 h-5 w-px bg-surface-gray-3" aria-hidden="true" />
          )
        }

        if (isComponentItem(item) && editor) {
          const Control = item.component
          return (
            <Control key={key} editor={editor}>
              {(trigger) => (
                <Button
                  size={size}
                  variant="ghost"
                  icon={item.icon}
                  label={item.label}
                  className="aria-pressed:bg-surface-gray-3"
                  aria-pressed={trigger.isActive === true || isPressed(item)}
                  disabled={isItemDisabled(item)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => (isItemDisabled(item) ? undefined : trigger.onClick())}
                />
              )}
            </Control>
          )
        }

        if (isGroup(item)) {
          return (
            <div key={key} data-slot="menu-group" className="flex items-center gap-1">
              <span className="px-2 text-sm-medium text-ink-gray-7">{item.label}</span>
              {item.items.map((groupItem) => (
                <Tooltip key={groupItem.label} text={groupItem.label}>
                  <Button
                    size={size}
                    variant="ghost"
                    icon={groupItem.icon}
                    label={groupItem.label}
                    className="aria-pressed:bg-surface-gray-3"
                    aria-pressed={isPressed(groupItem)}
                    disabled={isItemDisabled(groupItem)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => run(groupItem, event)}
                  />
                </Tooltip>
              ))}
            </div>
          )
        }

        const command = item as CommandMenuItem
        return (
          <Fragment key={key}>
            <Tooltip text={labelOf(command)}>
              <Button
                size={size}
                variant="ghost"
                icon={command.icon}
                label={labelOf(command)}
                className="aria-pressed:bg-surface-gray-3"
                aria-pressed={isPressed(command)}
                disabled={isItemDisabled(command)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => run(command, event)}
              />
            </Tooltip>
          </Fragment>
        )
      })}
    </TooltipProvider>
  )
}
