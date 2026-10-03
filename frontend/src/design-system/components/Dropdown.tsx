import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { cn } from '../utils/cn'
import { usePopoverMotion } from '../hooks/usePopoverMotion'
import { Button, type ButtonProps } from './Button'
import { Menu } from './Menu'
import { menuClasses, normalizeMenuOptions } from '../utils/menu'
import type { MenuOptions, MenuRenderers } from '../types/menu'
import '../styles/menu.css'

export type DropdownPlacement = 'left' | 'right' | 'center'
export type DropdownSide = 'top' | 'right' | 'bottom' | 'left'
export type DropdownAlign = 'start' | 'center' | 'end'

export interface DropdownTriggerProps {
  open: boolean
  close: () => void
  disabled: boolean
}

export interface DropdownProps extends MenuRenderers {
  button?: ButtonProps
  options?: MenuOptions
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  align?: DropdownAlign
  placement?: DropdownPlacement
  side?: DropdownSide
  offset?: number
  matchTriggerWidth?: boolean
  disabled?: boolean
  className?: string
  contentClassName?: string
  children?: ReactElement | ((props: DropdownTriggerProps) => ReactElement)
}

function resolveAlign(align: DropdownAlign | undefined, placement: DropdownPlacement | undefined): DropdownAlign {
  if (align !== undefined) return align
  if (placement === 'right') return 'end'
  if (placement === 'center') return 'center'
  return 'start'
}

export function Dropdown({
  button,
  options = [],
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  align,
  placement,
  side = 'bottom',
  offset = 4,
  matchTriggerWidth = false,
  disabled = false,
  className,
  contentClassName,
  children,
  ...renderers
}: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const { motion, onPointerDown, classifyOpen } = usePopoverMotion()

  const setOpen = useCallback(
    (next: boolean) => {
      if (next) classifyOpen()
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [classifyOpen, isControlled, onOpenChange],
  )

  const close = useCallback(() => setOpen(false), [setOpen])
  const groups = useMemo(() => normalizeMenuOptions(options), [options])
  const resolvedAlign = resolveAlign(align, placement)
  const triggerDisabled = disabled || button?.disabled === true
  const trigger = { open, close, disabled: triggerDisabled }

  let triggerNode: ReactNode
  if (typeof children === 'function') triggerNode = children(trigger)
  else if (children) triggerNode = children
  else
    triggerNode = (
      <Button {...button} className={cn(button?.className, className)}>
        {button?.label || 'Options'}
      </Button>
    )

  return (
    <RadixMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <RadixMenu.Trigger asChild disabled={triggerDisabled} onPointerDown={onPointerDown}>
        {triggerNode as ReactElement}
      </RadixMenu.Trigger>

      <RadixMenu.Portal>
        <RadixMenu.Content
          data-slot="content"
          data-motion={motion}
          className={cn(
            menuClasses.content,
            resolvedAlign === 'start' && 'origin-top-left',
            resolvedAlign === 'end' && 'origin-top-right',
            resolvedAlign === 'center' && 'origin-top',
            'z-[100]',
            contentClassName,
          )}
          side={side}
          align={resolvedAlign}
          sideOffset={offset}
          style={{ width: matchTriggerWidth ? 'var(--radix-dropdown-menu-trigger-width)' : undefined }}
        >
          <Menu groups={groups} close={close} renderers={renderers} />
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  )
}
