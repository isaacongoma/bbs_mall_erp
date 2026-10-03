import * as RadixHoverCard from '@radix-ui/react-hover-card'
import { useState, type ReactElement, type ReactNode } from 'react'
import { cn } from '../utils/cn'
import { PopoverPanel } from './Popover'

export interface HoverCardProps {
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  collisionPadding?: number
  hoverDelay?: number
  leaveDelay?: number
  arrow?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  trigger: ReactElement | ((props: { open: boolean }) => ReactElement)
  children?: ReactNode
}

export function HoverCard({
  side = 'bottom',
  align = 'start',
  offset = 4,
  collisionPadding = 10,
  hoverDelay = 0.3,
  leaveDelay = 0.3,
  arrow = false,
  open: controlledOpen,
  onOpenChange,
  className,
  trigger,
  children,
}: HoverCardProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen

  return (
    <RadixHoverCard.Root
      open={open}
      onOpenChange={(next) => {
        setInternalOpen(next)
        onOpenChange?.(next)
      }}
      openDelay={hoverDelay * 1000}
      closeDelay={leaveDelay * 1000}
    >
      <RadixHoverCard.Trigger asChild>
        {typeof trigger === 'function' ? trigger({ open }) : trigger}
      </RadixHoverCard.Trigger>
      <RadixHoverCard.Portal>
        <RadixHoverCard.Content
          data-slot="content"
          className={cn('z-[100]', className)}
          side={side}
          align={align}
          sideOffset={offset}
          collisionPadding={collisionPadding}
        >
          <PopoverPanel motion="animated" className="origin-(--radix-hover-card-content-transform-origin)">
            {children}
          </PopoverPanel>
          {arrow && <RadixHoverCard.Arrow data-slot="arrow" className="fill-surface-elevation-2" />}
        </RadixHoverCard.Content>
      </RadixHoverCard.Portal>
    </RadixHoverCard.Root>
  )
}
