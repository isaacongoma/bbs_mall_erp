import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLatest } from '../../hooks/useLatest'
import { usePresence } from '../../hooks/usePresence'
import { cn } from '../../utils/cn'
import type { ViewableImage } from '../extensions/image-viewer/collectImages'
import { useControlsAutoHide } from '../hooks/useControlsAutoHide'
import { useFullscreen } from '../hooks/useFullscreen'
import { useImageNavigation } from '../hooks/useImageNavigation'
import { useTouchHandler } from '../hooks/useTouchHandler'
import { useZoomPan } from '../hooks/useZoomPan'
import { downloadImage } from '../utils/imageViewerDownload'
import { createImageViewerKeydown } from '../utils/imageViewerKeymap'
import { ImageViewerControlsBar } from './ImageViewerControlsBar'

export interface ImageViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: ViewableImage[]
  initialIndex: number
}

function ImageViewerContent({ open, onOpenChange, images, initialIndex }: ImageViewerModalProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [backdrop, setBackdrop] = useState<HTMLDivElement | null>(null)
  const [controlsBar, setControlsBar] = useState<HTMLDivElement | null>(null)
  const [touchStartZoom, setTouchStartZoom] = useState(100)

  const {
    zoomLevel,
    panPosition,
    isMousePanning,
    setGestureStartPan,
    getGestureStartPan,
    setZoomLevel,
    setPanPosition,
    zoomIn,
    zoomOut,
    resetZoom,
    handlePanStart,
    snapThresholdLower,
    snapThresholdUpper,
  } = useZoomPan(container, open)

  const { currentIndex, nextImage, previousImage } = useImageNavigation({
    initialIndex,
    imageCount: images.length,
    onNavigate: resetZoom,
  })
  const currentImage = images[currentIndex]

  const close = () => {
    onOpenChange(false)
    resetZoom()
  }

  const touch = useTouchHandler({
    target: container,
    zoomLevel,
    panThreshold: 10,
    onSwipeLeft: () => {
      if (zoomLevel <= 100) nextImage()
    },
    onSwipeRight: () => {
      if (zoomLevel <= 100) previousImage()
    },
    onDoubleTap: (event) => {
      if (controlsBar?.contains(event.target as Node)) return
      if (zoomLevel > 100) {
        resetZoom()
      } else {
        setZoomLevel(200)
        setPanPosition({ x: 0, y: 0 })
      }
    },
    onTap: (event) => {
      if (event.target === backdrop) close()
    },
    onPanStart: () => {
      if (zoomLevel <= 100) return
      setGestureStartPan({ ...panPosition })
    },
    onPanMove: (deltaX, deltaY) => {
      if (zoomLevel <= 100) return
      const start = getGestureStartPan()
      setPanPosition({ x: start.x + deltaX, y: start.y + deltaY })
    },
    onPanAnimate: (deltaX, deltaY) => {
      setPanPosition({ x: panPosition.x + deltaX, y: panPosition.y + deltaY })
    },
    onPinchStart: () => {
      setTouchStartZoom(zoomLevel)
      setGestureStartPan({ ...panPosition })
    },
    onPinchMove: (scale) => {
      const newZoom = touchStartZoom * scale
      let finalZoom = Math.max(25, Math.min(300, Math.round(newZoom)))
      if (finalZoom > snapThresholdLower && finalZoom < snapThresholdUpper) finalZoom = 100
      setZoomLevel(finalZoom)
    },
    onPinchEnd: () => {
      if (zoomLevel < 100) resetZoom()
      setGestureStartPan({ x: 0, y: 0 })
    },
  })
  const isPanning = isMousePanning || touch.isPanning
  const latestFlags = useLatest({ isPanning, isPinching: touch.isPinching })

  const { isControlsVisible, handleActivity, showAndReset } = useControlsAutoHide({
    isPaused: () => latestFlags().isPanning || latestFlags().isPinching,
  })
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  const onToggleFullscreen = () => {
    if (container) toggleFullscreen(container)
  }

  const latest = useLatest({ close, nextImage, previousImage, zoomIn, zoomOut, onToggleFullscreen, handleActivity })

  useEffect(() => {
    showAndReset()
  }, [showAndReset])

  useEffect(() => {
    const handleKeyDown = createImageViewerKeydown({
      isOpen: () => true,
      isPanning: () => latestFlags().isPanning,
      onActivity: () => latest().handleActivity(),
      next: () => latest().nextImage(),
      previous: () => latest().previousImage(),
      zoomIn: () => latest().zoomIn(),
      zoomOut: () => latest().zoomOut(),
      toggleFullscreen: () => latest().onToggleFullscreen(),
      close: () => latest().close(),
    })
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [latest, latestFlags])

  if (!currentImage) return null

  return (
    <div
      ref={setContainer}
      className="fixed left-0 top-0 z-[50] flex h-full w-full touch-none flex-col items-center justify-center overflow-hidden bg-black sm:bg-black/90"
      onMouseMove={handleActivity}
      onTouchStart={handleActivity}
      onTouchMove={handleActivity}
    >
      <div ref={setBackdrop} className="absolute inset-0 z-0" onClick={close} />

      <div className="relative z-10 flex flex-col items-center">
        <img
          src={currentImage.src}
          alt={currentImage.alt || 'Image preview'}
          className="block max-h-screen max-w-screen object-contain"
          style={{
            transform: `scale(${zoomLevel / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
            cursor: zoomLevel > 100 ? (isMousePanning ? 'grabbing' : 'grab') : 'default',
            transition:
              isPanning || touch.isPinching || touch.isAnimatingPan
                ? 'none'
                : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          onMouseDown={handlePanStart}
          draggable={false}
        />
      </div>

      {currentImage.alt && (
        <div
          className={cn(
            'absolute bottom-4 z-10 rounded-sm bg-black/65 p-2 text-center text-sm text-white transition-opacity duration-300 ease-in-out',
            !isControlsVisible && 'pointer-events-none opacity-0',
          )}
        >
          {currentImage.alt}
        </div>
      )}

      <ImageViewerControlsBar
        ref={setControlsBar}
        visible={isControlsVisible}
        currentIndex={currentIndex}
        total={images.length}
        zoomLevel={zoomLevel}
        isFullscreen={isFullscreen}
        onPrevious={previousImage}
        onNext={nextImage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onDownload={() => downloadImage(currentImage)}
        onToggleFullscreen={onToggleFullscreen}
        onClose={close}
      />
    </div>
  )
}

export function ImageViewerModal(props: ImageViewerModalProps) {
  const { mounted, state } = usePresence(props.open, 150)
  if (!mounted) return null
  return createPortal(
    <div
      className={cn('transition-opacity duration-150 ease-in-out', state === 'present' ? 'opacity-100' : 'opacity-0')}
    >
      <ImageViewerContent {...props} />
    </div>,
    document.body,
  )
}
