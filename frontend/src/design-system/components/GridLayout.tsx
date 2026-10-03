import ReactGridLayout, { useContainerWidth, verticalCompactor, type Layout, type LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { ReactNode } from 'react'
import '../styles/gridLayout.css'
import { cn } from '../utils/cn'

export type GridLayoutItem = LayoutItem
export type GridLayoutValue = Layout

export interface GridLayoutItemContext extends LayoutItem {
  index: number
}

export interface GridLayoutProps {
  value: GridLayoutValue
  onChange?: (layout: GridLayoutValue) => void
  cols?: number
  rowHeight?: number
  disabled?: boolean
  className?: string
  renderItem?: (item: GridLayoutItemContext) => ReactNode
}

const MARGIN = [0, 0] as const

export function GridLayout({
  value,
  onChange,
  cols = 12,
  rowHeight = 52,
  disabled = false,
  className,
  renderItem,
}: GridLayoutProps) {
  const { width, containerRef, mounted } = useContainerWidth()

  return (
    <div ref={containerRef} className={cn('vgl-layout', className)}>
      {mounted && (
        <ReactGridLayout
          width={width}
          layout={value}
          gridConfig={{ cols, rowHeight, margin: MARGIN, containerPadding: MARGIN, maxRows: Infinity }}
          dragConfig={{ enabled: !disabled, bounded: false }}
          resizeConfig={{ enabled: !disabled, handles: ['se'] }}
          compactor={verticalCompactor}
          onLayoutChange={onChange}
        >
          {value.map((item, index) => (
            <div key={item.i}>
              {renderItem ? (
                renderItem({ ...item, index })
              ) : (
                <pre className="h-full w-full rounded bg-surface-base p-4 shadow">{JSON.stringify(item, null, 2)}</pre>
              )}
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  )
}
