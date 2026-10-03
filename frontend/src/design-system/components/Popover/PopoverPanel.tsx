import type { ComponentPropsWithRef } from 'react'
import { cn } from '../../utils/cn'
import type { PopoverMotion } from '../../hooks/usePopoverMotion'
import '../../styles/popoverPanel.css'

export const popoverPanelClasses =
  'overflow-hidden rounded-lg bg-surface-elevation-2 shadow-2xl ring-1 ring-black/5 will-change-[opacity,transform]'

export interface PopoverPanelProps extends ComponentPropsWithRef<'div'> {
  motion?: PopoverMotion
  state?: 'open' | 'closed'
}

export function PopoverPanel({ motion = 'animated', state, className, children, ...rest }: PopoverPanelProps) {
  return (
    <div
      data-slot="content-body"
      data-panel=""
      data-motion={motion}
      data-state={state}
      className={cn(popoverPanelClasses, className)}
      {...rest}
    >
      {children}
    </div>
  )
}
