import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface LayoutHeaderProps {
  left?: ReactNode
  right?: ReactNode
  children?: ReactNode
}

const noopSubscribe = () => () => undefined

export function LayoutHeader({ left, right, children }: LayoutHeaderProps) {
  const target = useSyncExternalStore(
    noopSubscribe,
    () => document.getElementById('app-header'),
    () => null,
  )
  if (!target) return null

  return createPortal(
    children ?? (
      <header className="flex h-10.5 items-center justify-between py-[7px] pl-2 sm:pl-5">
        <div className="flex items-center gap-2">{left}</div>
        <div className="flex items-center gap-2">{right}</div>
      </header>
    ),
    target,
  )
}
