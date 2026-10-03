import type { ReactNode, Ref } from 'react'
import { Tooltip } from '../../components/Tooltip'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'

export interface ImageViewerControlsBarProps {
  visible: boolean
  currentIndex: number
  total: number
  zoomLevel: number
  isFullscreen: boolean
  onPrevious: () => void
  onNext: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onDownload: () => void
  onToggleFullscreen: () => void
  onClose: () => void
  ref?: Ref<HTMLDivElement>
}

function ControlButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <Tooltip text={label}>
      <button
        type="button"
        aria-label={label}
        className={cn('p-2 hover:bg-gray-900 focus:outline-none', className)}
        onClick={(event) => {
          event.stopPropagation()
          onClick()
        }}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export function ImageViewerControlsBar({
  visible,
  currentIndex,
  total,
  zoomLevel,
  isFullscreen,
  onPrevious,
  onNext,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onDownload,
  onToggleFullscreen,
  onClose,
  ref,
}: ImageViewerControlsBarProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'absolute top-4 z-20 flex items-center space-x-3 p-2 text-white transition-opacity duration-300 ease-in-out',
        !visible && 'pointer-events-none opacity-0',
      )}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="flex items-center rounded bg-black/65">
        <ControlButton label="Previous image" onClick={onPrevious} className="rounded-l">
          <LucideIcon name="lucide-chevron-left" className="size-4" />
        </ControlButton>
        <span className="select-none px-2 text-sm tabular-nums text-gray-400">
          {currentIndex + 1}/{total}
        </span>
        <ControlButton label="Next image" onClick={onNext} className="rounded-r">
          <LucideIcon name="lucide-chevron-right" className="size-4" />
        </ControlButton>
      </div>

      <div className="flex items-center rounded bg-black/65">
        <ControlButton label="Zoom out" onClick={onZoomOut} className="rounded-l">
          <LucideIcon name="lucide-minus" className="size-4" />
        </ControlButton>
        <ControlButton label="Reset zoom" onClick={onResetZoom} className="text-sm text-gray-400">
          {zoomLevel}%
        </ControlButton>
        <ControlButton label="Zoom in" onClick={onZoomIn} className="rounded-r">
          <LucideIcon name="lucide-plus" className="size-4" />
        </ControlButton>
      </div>

      <div className="flex items-center rounded bg-black/65">
        <ControlButton label="Download image" onClick={onDownload} className="rounded-l">
          <LucideIcon name="lucide-download" className="size-4" />
        </ControlButton>
        <ControlButton
          label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={onToggleFullscreen}
          className="hidden rounded-r sm:block"
        >
          <LucideIcon name={isFullscreen ? 'lucide-minimize' : 'lucide-maximize'} className="size-4" />
        </ControlButton>
      </div>

      <div className="flex items-center rounded bg-black/65">
        <ControlButton label="Close" onClick={onClose} className="rounded">
          <LucideIcon name="lucide-x" className="size-4" />
        </ControlButton>
      </div>
    </div>
  )
}
