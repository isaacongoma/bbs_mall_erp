import { createElement, useState, type ComponentType } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'

export interface ImperativeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface ImperativeModalHandle {
  close: () => void
  destroy: () => void
}

const EXIT_DELAY_MS = 300

export function openImperativeModal<P extends ImperativeModalProps>(
  component: ComponentType<P>,
  props: Omit<P, keyof ImperativeModalProps>,
  onDestroyed?: () => void,
): ImperativeModalHandle {
  const container = document.createElement('div')
  document.body.appendChild(container)
  let root: Root | null = createRoot(container)
  let destroyed = false
  let setOpenExternal: ((open: boolean) => void) | null = null

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    const current = root
    root = null
    queueMicrotask(() => current?.unmount())
    container.remove()
    onDestroyed?.()
  }

  function Host() {
    const [open, setOpen] = useState(true)
    setOpenExternal = setOpen
    return createElement(component, {
      ...(props as unknown as P),
      open,
      onOpenChange: (next: boolean) => {
        setOpen(next)
        if (!next) setTimeout(destroy, EXIT_DELAY_MS)
      },
    })
  }

  flushSync(() => root?.render(createElement(Host)))

  return {
    close: () => {
      setOpenExternal?.(false)
      setTimeout(destroy, EXIT_DELAY_MS)
    },
    destroy,
  }
}
