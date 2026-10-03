import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useLatest } from '../../hooks/useLatest'

export interface PanPosition {
  x: number
  y: number
}

interface ZoomPanState {
  zoom: number
  pan: PanPosition
}

const SNAP_LOWER = 90
const SNAP_UPPER = 110
const ORIGIN: PanPosition = { x: 0, y: 0 }

export function useZoomPan(container: HTMLElement | null, isEnabled: boolean) {
  const [state, setState] = useState<ZoomPanState>({ zoom: 100, pan: ORIGIN })
  const [isMousePanning, setIsMousePanning] = useState(false)
  const gestureStartPan = useRef<PanPosition>(ORIGIN)
  const setGestureStartPan = useCallback((pan: PanPosition) => {
    gestureStartPan.current = pan
  }, [])
  const getGestureStartPan = useCallback(() => gestureStartPan.current, [])
  const latest = useLatest({ state, isEnabled, container })

  const setZoomLevel = useCallback((next: number) => {
    setState((previous) => ({
      zoom: next,
      pan: next <= 100 && previous.zoom > 100 ? ORIGIN : previous.pan,
    }))
  }, [])

  const setPanPosition = useCallback((pan: PanPosition) => {
    setState((previous) => ({ ...previous, pan }))
  }, [])

  const zoomIn = useCallback(() => {
    setState((previous) => ({ ...previous, zoom: Math.min(previous.zoom + 25, 300) }))
  }, [])

  const zoomOut = useCallback(() => {
    setState((previous) => {
      const next = Math.max(previous.zoom - 25, 25)
      const zoom = previous.zoom > 100 && next < 100 ? 100 : next
      return { zoom, pan: zoom <= 100 && previous.zoom > 100 ? ORIGIN : previous.pan }
    })
  }, [])

  const resetZoom = useCallback(() => {
    setState({ zoom: 100, pan: ORIGIN })
    setIsMousePanning(false)
    gestureStartPan.current = ORIGIN
  }, [])

  const handlePanStart = useCallback(
    (event: ReactMouseEvent) => {
      if (latest().state.zoom <= 100) return
      event.preventDefault()
      setIsMousePanning(true)
      const startX = event.clientX
      const startY = event.clientY
      gestureStartPan.current = { ...latest().state.pan }

      const onMove = (moveEvent: MouseEvent) => {
        const zoomFactor = latest().state.zoom / 100
        setState((previous) => ({
          ...previous,
          pan: {
            x: gestureStartPan.current.x + (moveEvent.clientX - startX) / zoomFactor,
            y: gestureStartPan.current.y + (moveEvent.clientY - startY) / zoomFactor,
          },
        }))
      }
      const onUp = () => {
        setIsMousePanning(false)
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [latest],
  )

  useEffect(() => {
    if (!container) return
    const onWheel = (event: WheelEvent) => {
      if (!latest().isEnabled) return
      if (!latest().container?.contains(event.target as Node)) return
      event.preventDefault()

      const dampingFactor = event.ctrlKey ? 0.5 : 0.2
      const zoomChange = -event.deltaY * dampingFactor
      const currentZoom = latest().state.zoom
      const newZoom = Math.round(currentZoom + zoomChange)
      let clamped = Math.max(25, Math.min(300, newZoom))

      if ((currentZoom > 100 && clamped < 100) || (currentZoom < 100 && clamped > 100)) {
        if (Math.abs(100 - clamped) < Math.abs(zoomChange) * 1.5) clamped = 100
      }
      setZoomLevel(clamped)
    }
    container.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => container.removeEventListener('wheel', onWheel, { capture: true })
  }, [container, latest, setZoomLevel])

  return {
    zoomLevel: state.zoom,
    panPosition: state.pan,
    isMousePanning,
    setGestureStartPan,
    getGestureStartPan,
    setZoomLevel,
    setPanPosition,
    zoomIn,
    zoomOut,
    resetZoom,
    handlePanStart,
    snapThresholdLower: SNAP_LOWER,
    snapThresholdUpper: SNAP_UPPER,
  }
}
