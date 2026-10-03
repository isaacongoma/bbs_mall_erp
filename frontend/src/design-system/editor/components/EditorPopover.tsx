import { FocusScope } from '@radix-ui/react-focus-scope'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface EditorPopoverProps {
  dialogLabel: string
  contentClass?: string
  autofocus?: boolean
  trapped?: boolean
  loop?: boolean
  children?: ReactNode
}

export function EditorPopover({
  dialogLabel,
  contentClass,
  autofocus = true,
  trapped = true,
  loop = true,
  children,
}: EditorPopoverProps) {
  return (
    <FocusScope
      asChild
      loop={loop}
      trapped={trapped}
      onMountAutoFocus={(event) => {
        if (!autofocus) event.preventDefault()
      }}
      onUnmountAutoFocus={(event) => event.preventDefault()}
    >
      <div
        role="dialog"
        aria-label={dialogLabel}
        tabIndex={-1}
        className={cn(
          'editor-popover border border-outline-gray-2 bg-surface-elevation-2 shadow-2xl outline-none',
          contentClass,
        )}
      >
        {children}
      </div>
    </FocusScope>
  )
}
