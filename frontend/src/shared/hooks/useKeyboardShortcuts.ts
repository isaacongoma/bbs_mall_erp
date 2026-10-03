import { useEffect } from 'react'
import { useLatest } from '@/design-system/hooks/useLatest'
import { isDialogOpen } from '@/design-system'

export interface ShortcutDefinition {
  keys?: string | string[]
  match?: (event: KeyboardEvent) => boolean
  guard?: (event: KeyboardEvent) => boolean
  preventDefault?: boolean
  stopPropagation?: boolean
  action?: (event: KeyboardEvent) => void
}

export interface KeyboardShortcutOptions {
  active?: boolean | (() => boolean)
  shortcuts?: Array<ShortcutDefinition | null | undefined>
  ignoreTyping?: boolean
  skipWhenDialogOpen?: boolean
}

function isTypingEvent(event: KeyboardEvent): boolean {
  const el = event.target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return Boolean(
    el.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (el.closest && el.closest('[contenteditable="true"]')),
  )
}

function matches(definition: ShortcutDefinition, event: KeyboardEvent): boolean {
  if (definition.match) return definition.match(event)
  const keys = definition.keys
  if (!keys) return false
  return (Array.isArray(keys) ? keys : [keys]).some((key) => key === event.key)
}

export function useKeyboardShortcuts(options: KeyboardShortcutOptions) {
  const latest = useLatest(options)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const { active = true, shortcuts = [], ignoreTyping = true, skipWhenDialogOpen = true } = latest()
      const isActive = typeof active === 'function' ? active() : active
      if (!isActive) return
      if (ignoreTyping && isTypingEvent(event)) return
      if (skipWhenDialogOpen && isDialogOpen()) return

      for (const definition of shortcuts) {
        if (!definition) continue
        if (definition.guard && !definition.guard(event)) continue
        if (matches(definition, event)) {
          if (definition.preventDefault !== false) event.preventDefault()
          if (definition.stopPropagation) event.stopPropagation()
          definition.action?.(event)
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [latest])
}
