import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/design-system'

export interface ResizerProps {
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  side?: 'left' | 'right'
  parent?: HTMLElement | null
  className?: string
  children?: (state: { sidebarResizing: boolean; sidebarWidth: number }) => ReactNode
}

export function Resizer({
  defaultWidth = 352,
  minWidth = 16 * 16,
  maxWidth = 30 * 16,
  side = 'left',
  parent = null,
  className,
  children,
}: ResizerProps) {
  const [resizing, setResizing] = useState(false)
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem('sidebarWidth'))
    return stored && stored >= minWidth && stored <= maxWidth ? stored : defaultWidth
  })
  const widthRef = useRef(width)

  const startResize = () => {
    const resize = (event: MouseEvent) => {
      setResizing(true)
      document.body.classList.add('select-none', 'cursor-col-resize')
      document.querySelectorAll('.select-text').forEach((el) => {
        el.classList.remove('select-text')
        el.classList.add('select-text1')
      })

      let next = side === 'left' ? event.clientX : window.innerWidth - event.clientX
      const gap = parent ? parent.getBoundingClientRect()[side] : 0
      next -= gap

      if (next > defaultWidth - 10 && next < defaultWidth + 10) next = defaultWidth
      if (next < minWidth) next = minWidth
      if (next > maxWidth) next = maxWidth

      widthRef.current = next
      setWidth(next)
    }

    const stop = () => {
      document.body.classList.remove('select-none', 'cursor-col-resize')
      document.querySelectorAll('.select-text1').forEach((el) => {
        el.classList.remove('select-text1')
        el.classList.add('select-text')
      })
      localStorage.setItem('sidebarWidth', String(widthRef.current))
      setResizing(false)
      document.removeEventListener('mousemove', resize)
      document.removeEventListener('mouseup', stop)
    }

    document.addEventListener('mousemove', resize)
    document.addEventListener('mouseup', stop)
  }

  return (
    <div className={cn('relative', className)} style={{ width: `${width}px` }}>
      {children?.({ sidebarResizing: resizing, sidebarWidth: width })}
      <div
        className={cn(
          'absolute z-10 h-full w-1 cursor-col-resize bg-surface-gray-4 opacity-0 transition-opacity hover:opacity-100',
          resizing && 'opacity-100',
          side === 'right' ? 'left-0' : 'right-0',
        )}
        onMouseDown={startResize}
      />
    </div>
  )
}
