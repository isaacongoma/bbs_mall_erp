import * as RadixTooltip from '@radix-ui/react-tooltip'
import { createContext, useContext, type ReactElement, type ReactNode } from 'react'
import { cn } from '../utils/cn'

const ProviderPresence = createContext(false)

export interface TooltipProviderProps {
  children: ReactNode
  delayDuration?: number
  skipDelayDuration?: number
}

export function TooltipProvider({ children, delayDuration = 500, skipDelayDuration = 300 }: TooltipProviderProps) {
  return (
    <ProviderPresence.Provider value>
      <RadixTooltip.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
        {children}
      </RadixTooltip.Provider>
    </ProviderPresence.Provider>
  )
}

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

export interface TooltipBubbleProps {
  side?: TooltipSide
  text?: ReactNode
  content?: ReactNode
  body?: ReactNode
  arrowClassName?: string
}

export function TooltipBubble({
  side = 'top',
  text,
  content,
  body,
  arrowClassName = 'fill-surface-gray-10',
}: TooltipBubbleProps) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content side={side} sideOffset={4} className="z-[100]">
        {body ?? (
          <div className="rounded bg-surface-gray-10 px-2 py-1 text-xs text-ink-base shadow-xl">{content ?? text}</div>
        )}
        <RadixTooltip.Arrow className={cn(arrowClassName)} width={8} height={4} />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  )
}

export interface TooltipProps {
  children: ReactElement
  text?: ReactNode
  content?: ReactNode
  body?: ReactNode
  placement?: TooltipSide
  hoverDelay?: number
  arrowClassName?: string
  disabled?: boolean
}

export function Tooltip({
  children,
  text = '',
  content,
  body,
  placement = 'top',
  hoverDelay = 0.5,
  arrowClassName,
  disabled = false,
}: TooltipProps) {
  const hasProvider = useContext(ProviderPresence)
  if (disabled) return children

  const hasBubble = Boolean(text) || Boolean(content) || Boolean(body)
  const root = (
    <RadixTooltip.Root delayDuration={hoverDelay * 1000}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      {hasBubble && (
        <TooltipBubble side={placement} text={text} content={content} body={body} arrowClassName={arrowClassName} />
      )}
    </RadixTooltip.Root>
  )

  return hasProvider ? root : <TooltipProvider delayDuration={hoverDelay * 1000}>{root}</TooltipProvider>
}
