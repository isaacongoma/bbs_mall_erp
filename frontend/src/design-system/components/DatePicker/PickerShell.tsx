import * as RadixPopover from '@radix-ui/react-popover'
import { useCallback, useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'
import { usePopoverMotion } from '../../hooks/usePopoverMotion'
import type { FormError } from '../../hooks/useInputLabeling'
import { PopoverPanel } from '../Popover'
import type { InputSize, InputVariant } from '../../types/input'
import { TextInput } from '../TextInput'

export interface PickerTriggerProps {
  togglePopover: () => void
  isOpen: boolean
  displayLabel: string
  inputValue: string
}

export interface PickerShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inputValue: string
  onInputValueChange: (value: string) => void
  onTypingChange: (typing: boolean) => void
  side: 'top' | 'right' | 'bottom' | 'left'
  align: 'start' | 'center' | 'end'
  offset: number
  openOnFocus?: boolean
  openOnClick?: boolean
  id?: string
  label?: string
  description?: string
  error?: string | FormError | null
  required?: boolean
  size?: InputSize
  variant?: InputVariant
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  displayLabel?: string
  className?: string
  contentClassName?: string
  onBlurCommit?: () => void
  onEnter?: () => void
  onOpened?: () => void
  onClosed?: () => void
  onRequestFocus?: () => void
  trigger?: (props: PickerTriggerProps) => ReactNode
  prefix?: (props: PickerTriggerProps) => ReactNode
  suffix?: (props: PickerTriggerProps) => ReactNode
  children: (controls: { close: () => void }) => ReactNode
}

export function PickerShell({
  open,
  onOpenChange,
  inputValue,
  onInputValueChange,
  onTypingChange,
  side,
  align,
  offset,
  openOnFocus = false,
  openOnClick = true,
  id,
  label,
  description,
  error,
  required,
  size,
  variant,
  placeholder,
  disabled,
  readOnly,
  displayLabel = '',
  className,
  contentClassName,
  onBlurCommit,
  onEnter,
  onOpened,
  onClosed,
  onRequestFocus,
  trigger,
  prefix,
  suffix,
  children,
}: PickerShellProps) {
  const { motion, onPointerDown, classifyOpen } = usePopoverMotion()
  const [inputNode, setInputNode] = useState<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const hasCustomTrigger = trigger !== undefined

  const setOpen = useCallback(
    (next: boolean) => {
      if (next === open) return
      if (next) classifyOpen()
      onOpenChange(next)
    },
    [open, onOpenChange, classifyOpen],
  )

  const handleOpenTransition = useEffectEvent((isOpen: boolean) => {
    if (isOpen) {
      onOpened?.()
      if (hasCustomTrigger) onRequestFocus?.()
      return
    }
    const hadFocusInside = panelRef.current?.contains(document.activeElement) ?? false
    onClosed?.()
    if (hadFocusInside) requestAnimationFrame(() => inputNode?.focus())
  })

  const lastOpen = useRef(open)

  useEffect(() => {
    if (lastOpen.current === open) return
    lastOpen.current = open
    handleOpenTransition(open)
  }, [open])

  const triggerProps: PickerTriggerProps = {
    togglePopover: () => setOpen(!open),
    isOpen: open,
    displayLabel,
    inputValue,
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown') return
    event.preventDefault()
    if (!open) setOpen(true)
    onRequestFocus?.()
  }

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Anchor asChild>
        <div className={className} onKeyDown={onKeyDown}>
          {trigger ? (
            trigger(triggerProps)
          ) : (
            <TextInput
              inputRef={setInputNode}
              type="text"
              value={inputValue}
              onChange={onInputValueChange}
              id={id}
              label={label}
              description={description}
              error={error}
              required={required}
              size={size}
              variant={variant}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              onPointerDown={onPointerDown}
              onFocus={() => {
                onTypingChange(true)
                if (openOnFocus && !open) setOpen(true)
              }}
              onClick={() => {
                onTypingChange(true)
                if (openOnClick && !open) setOpen(true)
              }}
              onBlur={(event) => {
                const next = event.relatedTarget as Node | null
                if (next && panelRef.current?.contains(next)) return
                onBlurCommit?.()
                onTypingChange(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onEnter?.()
                  onTypingChange(false)
                }
              }}
              prefix={prefix?.(triggerProps)}
              suffix={
                suffix ? (
                  suffix(triggerProps)
                ) : (
                  <span
                    onMouseDown={(event) => {
                      event.preventDefault()
                      setOpen(!open)
                    }}
                  >
                    <LucideIcon name="chevron-down" className="h-4 w-4 cursor-pointer" />
                  </span>
                )
              }
            />
          )}
        </div>
      </RadixPopover.Anchor>

      <RadixPopover.Portal>
        <RadixPopover.Content
          data-slot="content"
          className="z-[100]"
          side={side}
          align={align}
          sideOffset={offset}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            const target = event.target as Node | null
            const row = inputNode?.parentElement
            if (target && row?.contains(target)) event.preventDefault()
          }}
        >
          <PopoverPanel
            ref={panelRef}
            motion={motion}
            className={cn('origin-(--radix-popover-content-transform-origin)', contentClassName)}
          >
            {children({ close: () => setOpen(false) })}
          </PopoverPanel>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
