import { useEffect, useMemo, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'
import type { CommandMenuItem, MenuItem } from '../menu'
import type { Editor } from '../types/editor'

export interface TableContextMenuProps {
  editor: Editor
  items: MenuItem[]
  onRun?: () => void
}

function isSeparator(item: MenuItem): item is { type: 'separator' } {
  return 'type' in item && item.type === 'separator'
}

function isCommand(item: MenuItem): item is CommandMenuItem {
  return !('type' in item)
}

function nextFocusIndex(key: string, index: number, count: number): number | null {
  if (key === 'ArrowDown') return (index + 1) % count
  if (key === 'ArrowUp') return index <= 0 ? count - 1 : index - 1
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

export function TableContextMenu({ editor, items, onRun }: TableContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const visible = useMemo<MenuItem[]>(() => {
    const out: MenuItem[] = []
    for (const item of items) {
      if (isSeparator(item)) {
        const last = out[out.length - 1]
        if (last && !isSeparator(last)) out.push(item)
      } else if (isCommand(item) && item.isAvailable?.(editor) !== false) {
        out.push(item)
      }
    }
    const last = out[out.length - 1]
    if (last && isSeparator(last)) out.pop()
    return out
  }, [items, editor])

  const focusables = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])

  useEffect(() => {
    focusables()[0]?.focus()
    const menu = menuRef.current
    return () => {
      if (menu?.contains(document.activeElement)) {
        try {
          editor.view.focus()
        } catch {
          return
        }
      }
    }
  }, [editor])

  const run = (item: CommandMenuItem, event: MouseEvent<HTMLButtonElement>) => {
    if (item.isDisabled?.(editor) === true) return
    item.action(editor, { event: event.nativeEvent, trigger: event.currentTarget })
    onRun?.()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const list = focusables()
    if (!list.length) return
    const index = list.indexOf(document.activeElement as HTMLButtonElement)
    const next = nextFocusIndex(event.key, index, list.length)
    if (next === null) return
    event.preventDefault()
    list[next]?.focus()
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      className="min-w-[208px] rounded-lg border border-outline-gray-1 bg-surface-elevation-2 p-1 text-base shadow-xl outline-none"
      onKeyDown={onKeyDown}
    >
      {visible.map((item, index) => {
        if (isSeparator(item)) return <div key={index} className="my-1 h-px bg-surface-gray-2" aria-hidden="true" />
        if (!isCommand(item)) return null
        const checked = item.isActive?.(editor) === true
        return (
          <button
            key={index}
            type="button"
            role={item.isActive ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={item.isActive ? checked : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-ink-gray-8 hover:bg-surface-gray-3 focus-visible:bg-surface-gray-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            )}
            disabled={item.isDisabled?.(editor) === true}
            onClick={(event) => run(item, event)}
          >
            {typeof item.icon === 'string' && <LucideIcon name={item.icon} className="size-4 shrink-0" />}
            <span>{item.getLabel?.(editor) ?? item.label}</span>
            {checked && <LucideIcon name="lucide-check" className="ml-auto size-4 shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
