import type { ReactNode } from 'react'
import { LucideIcon, cn } from '@/design-system'

export interface KeyboardShortcutProps {
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  bg?: boolean
  children?: ReactNode
}

const IS_MAC = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')

export function KeyboardShortcut({ meta, ctrl, shift, alt, bg, children }: KeyboardShortcutProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 text-sm',
        bg ? 'rounded-sm bg-surface-gray-2 px-1 py-0.5 text-ink-gray-5' : 'text-ink-gray-4',
      )}
    >
      {(ctrl || meta) && <span>{IS_MAC ? <LucideIcon name="command" className="h-3 w-3" /> : <span>Ctrl</span>}</span>}
      {shift && (
        <span>
          <LucideIcon name="arrow-big-up" className="h-3 w-3" />
        </span>
      )}
      {alt && (
        <span>
          <LucideIcon name="option" className="h-3 w-3" />
        </span>
      )}
      {children}
    </div>
  )
}
