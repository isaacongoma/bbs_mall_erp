import * as RadixScrollArea from '@radix-ui/react-scroll-area'
import { useImperativeHandle, useState, type ReactNode, type Ref } from 'react'
import { cn } from '../utils/cn'

export interface ScrollAreaHandle {
  viewportElement: HTMLDivElement | null
}

export interface ScrollAreaProps {
  orientation?: 'vertical' | 'horizontal' | 'both'
  scrollHideDelay?: number
  viewportClassName?: string
  className?: string
  children?: ReactNode
  handleRef?: Ref<ScrollAreaHandle>
}

function Scrollbar({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  return (
    <RadixScrollArea.Scrollbar
      orientation={orientation}
      className={cn(
        'flex touch-none select-none p-px transition-colors',
        orientation === 'vertical'
          ? 'h-full w-2 border-l border-l-transparent'
          : 'h-2 flex-col border-t border-t-transparent',
      )}
    >
      <RadixScrollArea.Thumb className="relative flex-1 rounded-full bg-surface-gray-4 hover:bg-surface-gray-5" />
    </RadixScrollArea.Scrollbar>
  )
}

export function ScrollArea({
  orientation = 'vertical',
  scrollHideDelay = 600,
  viewportClassName,
  className,
  children,
  handleRef,
}: ScrollAreaProps) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null)
  useImperativeHandle(handleRef, () => ({ viewportElement: viewport }), [viewport])

  return (
    <RadixScrollArea.Root scrollHideDelay={scrollHideDelay} className={cn('relative overflow-hidden', className)}>
      <RadixScrollArea.Viewport ref={setViewport} className={cn('h-full w-full', viewportClassName)}>
        {children}
      </RadixScrollArea.Viewport>
      {orientation !== 'horizontal' && <Scrollbar orientation="vertical" />}
      {(orientation === 'horizontal' || orientation === 'both') && <Scrollbar orientation="horizontal" />}
      <RadixScrollArea.Corner />
    </RadixScrollArea.Root>
  )
}
