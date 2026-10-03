import * as RadixPopover from '@radix-ui/react-popover'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { usePopoverMotion } from '../../hooks/usePopoverMotion'
import { PopoverPanel } from './PopoverPanel'

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left'
export type PopoverAlign = 'start' | 'center' | 'end'
export type PopoverPlacement =
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'right-start'
  | 'right-end'
  | 'left-start'
  | 'left-end'
  | 'top'
  | 'bottom'
  | 'right'
  | 'left'

export interface PopoverControls {
  open: () => void
  close: () => void
  toggle: (flag?: boolean) => void
  togglePopover: (flag?: boolean) => void
  isOpen: boolean
}

type Slot = ReactNode | ((controls: PopoverControls) => ReactNode)

export interface PopoverProps {
  target?: Slot
  body?: Slot
  bodyMain?: Slot
  trigger?: Slot
  children?: Slot
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  side?: PopoverSide
  align?: PopoverAlign
  placement?: PopoverPlacement
  offset?: number
  collisionPadding?: number
  dismissible?: boolean
  hideOnBlur?: boolean
  matchTriggerWidth?: boolean
  matchTargetWidth?: boolean
  bare?: boolean
  arrow?: boolean
  hoverTrigger?: boolean
  hoverDelay?: number
  leaveDelay?: number
  className?: string
  contentClassName?: string
}

function resolvePlacement(placement: PopoverPlacement | undefined, side: PopoverSide, align: PopoverAlign) {
  if (!placement) return { side, align }
  const [placementSide, placementAlign] = placement.split('-') as [PopoverSide, PopoverAlign | undefined]
  return { side: placementSide, align: placementAlign ?? 'center' }
}

function renderSlot(slot: Slot | undefined, controls: PopoverControls): ReactNode {
  return typeof slot === 'function' ? slot(controls) : slot
}

export function Popover({
  target,
  body,
  bodyMain,
  trigger,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  placement,
  offset = 4,
  collisionPadding = 10,
  dismissible = true,
  hideOnBlur,
  matchTriggerWidth = false,
  matchTargetWidth,
  bare = false,
  arrow = false,
  hoverTrigger = false,
  hoverDelay = 0,
  leaveDelay = 0.5,
  className,
  contentClassName,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const { motion, onPointerDown, classifyOpen } = usePopoverMotion()
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const pointerInside = useRef(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setOpen = useCallback(
    (next: boolean) => {
      if (next === isOpen) return
      if (next) classifyOpen()
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [classifyOpen, isControlled, isOpen, onOpenChange],
  )

  const controls: PopoverControls = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: (flag) => setOpen(flag ?? !isOpen),
    togglePopover: (flag) => setOpen(typeof flag === 'boolean' ? flag : !isOpen),
    isOpen,
  }

  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    },
    [],
  )

  const onMouseEnter = () => {
    pointerInside.current = true
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    if (!hoverTrigger) return
    if (hoverDelay) {
      hoverTimer.current = setTimeout(() => {
        if (pointerInside.current) setOpen(true)
      }, hoverDelay * 1000)
    } else {
      setOpen(true)
    }
  }

  const onMouseLeave = () => {
    pointerInside.current = false
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
    if (!hoverTrigger) return
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    if (leaveDelay) {
      leaveTimer.current = setTimeout(() => {
        if (!pointerInside.current) setOpen(false)
      }, leaveDelay * 1000)
    } else {
      setOpen(false)
    }
  }

  const resolved = resolvePlacement(placement, side, align)
  const canDismiss = hideOnBlur ?? dismissible
  const shouldMatchWidth = matchTargetWidth ?? matchTriggerWidth
  const newTrigger = trigger !== undefined
  const hasNewContent = children !== undefined && body === undefined && bodyMain === undefined
  const hasBareBody = !hasNewContent && body !== undefined

  const triggerNode = renderSlot(newTrigger ? trigger : target, controls)

  const content = hasBareBody ? (
    renderSlot(body, controls)
  ) : hasNewContent && bare ? (
    renderSlot(children, controls)
  ) : (
    <PopoverPanel motion={motion}>
      {hasNewContent ? renderSlot(children, controls) : renderSlot(bodyMain, controls)}
    </PopoverPanel>
  )

  return (
    <RadixPopover.Root open={isOpen} onOpenChange={setOpen}>
      {newTrigger ? (
        <RadixPopover.Trigger asChild onPointerDown={onPointerDown}>
          {triggerNode as React.ReactElement}
        </RadixPopover.Trigger>
      ) : (
        <RadixPopover.Anchor asChild>
          <div
            ref={anchorRef}
            className={cn('flex', className)}
            onPointerDown={onPointerDown}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {triggerNode}
          </div>
        </RadixPopover.Anchor>
      )}

      <RadixPopover.Portal>
        <RadixPopover.Content
          data-slot="content"
          side={resolved.side}
          align={resolved.align}
          sideOffset={offset}
          collisionPadding={collisionPadding}
          className={cn('z-[100] origin-(--radix-popover-content-transform-origin)', contentClassName)}
          style={{ minWidth: shouldMatchWidth ? 'var(--radix-popover-trigger-width)' : undefined }}
          onMouseEnter={() => {
            pointerInside.current = true
          }}
          onMouseLeave={onMouseLeave}
          onOpenAutoFocus={(event) => {
            if (!newTrigger) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (!canDismiss) {
              event.preventDefault()
              return
            }
            const targetNode = event.target as Node | null
            if (anchorRef.current && targetNode && anchorRef.current.contains(targetNode)) event.preventDefault()
          }}
        >
          {content}
          {arrow && <RadixPopover.Arrow data-slot="arrow" className="fill-surface-elevation-2" />}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
