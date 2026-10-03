import { useEffect, useRef, useState } from 'react'
import { useLatest } from '../../hooks/useLatest'

export interface UseTouchHandlerOptions {
  target: HTMLElement | null | undefined
  zoomLevel?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onDoubleTap?: (event: TouchEvent) => void
  onTap?: (event: TouchEvent) => void
  onPanStart?: (event: TouchEvent) => void
  onPanMove?: (deltaX: number, deltaY: number, event: TouchEvent) => void
  onPanAnimate?: (x: number, y: number) => void
  onPanEnd?: (event: TouchEvent) => void
  onPinchStart?: (event: TouchEvent) => void
  onPinchMove?: (scale: number, event: TouchEvent) => void
  onPinchEnd?: (event: TouchEvent) => void
  doubleTapDelay?: number
  minSwipeDistance?: number
  maxVerticalSwipeDistance?: number
  maxTapDuration?: number
  maxTapMovement?: number
  panThreshold?: number
  inertiaDamping?: number
  inertiaVelocityThreshold?: number
}

interface Point {
  x: number
  y: number
}

interface GestureState {
  isPanning: boolean
  isPinching: boolean
  isAnimatingPan: boolean
  startPan: Point
  lastTapTime: number
  touchStartTime: number
  touchStartDistance: number
  initialTouchCount: number
  lastMoveTime: number
  lastMoveCoords: Point
  velocity: Point
  frameId: number | null
}

function freshState(): GestureState {
  return {
    isPanning: false,
    isPinching: false,
    isAnimatingPan: false,
    startPan: { x: 0, y: 0 },
    lastTapTime: 0,
    touchStartTime: 0,
    touchStartDistance: 0,
    initialTouchCount: 0,
    lastMoveTime: 0,
    lastMoveCoords: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    frameId: null,
  }
}

export function useTouchHandler(options: UseTouchHandlerOptions) {
  const [flags, setFlags] = useState({ isPanning: false, isPinching: false, isAnimatingPan: false })
  const stateRef = useRef<GestureState>(freshState())
  const latest = useLatest(options)
  const target = options.target

  useEffect(() => {
    if (!target) return
    const s = stateRef.current

    const publish = () => {
      setFlags((previous) =>
        previous.isPanning === s.isPanning &&
        previous.isPinching === s.isPinching &&
        previous.isAnimatingPan === s.isAnimatingPan
          ? previous
          : { isPanning: s.isPanning, isPinching: s.isPinching, isAnimatingPan: s.isAnimatingPan },
      )
    }

    const cancelInertia = () => {
      if (s.frameId !== null) {
        cancelAnimationFrame(s.frameId)
        s.frameId = null
      }
      s.isAnimatingPan = false
      s.velocity = { x: 0, y: 0 }
      publish()
    }

    const handleTouchStart = (event: TouchEvent) => {
      const o = latest()
      const doubleTapDelay = o.doubleTapDelay ?? 300
      cancelInertia()
      event.preventDefault()

      s.isPanning = false
      s.isPinching = false
      s.initialTouchCount = event.touches.length

      const now = performance.now()
      const sinceLastTap = now - s.lastTapTime

      if (sinceLastTap < doubleTapDelay && sinceLastTap > 0 && event.touches.length === 1 && o.onDoubleTap) {
        o.onDoubleTap(event)
        s.lastTapTime = 0
        s.touchStartTime = 0
        publish()
        return
      }

      s.touchStartTime = now
      const first = event.touches[0]
      const second = event.touches[1]
      if (event.touches.length === 1 && first) {
        s.lastTapTime = now
        s.startPan = { x: first.clientX, y: first.clientY }
        s.lastMoveTime = now
        s.lastMoveCoords = { ...s.startPan }
        s.velocity = { x: 0, y: 0 }
        o.onPanStart?.(event)
      } else if (event.touches.length === 2 && first && second) {
        s.lastTapTime = 0
        s.touchStartDistance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
        s.isPinching = true
        o.onPinchStart?.(event)
      } else {
        s.lastTapTime = 0
        s.touchStartTime = 0
      }
      publish()
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (s.initialTouchCount === 0) return
      event.preventDefault()
      const o = latest()
      const panThreshold = o.panThreshold ?? 5
      const zoomLevel = o.zoomLevel ?? 100

      const now = performance.now()
      const deltaTime = now - s.lastMoveTime
      const first = event.touches[0]
      const second = event.touches[1]

      if (event.touches.length === 2 && s.initialTouchCount === 2 && first && second) {
        s.isPanning = false
        s.isPinching = true
        const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
        if (s.touchStartDistance > 0 && o.onPinchMove) o.onPinchMove(distance / s.touchStartDistance, event)
        s.velocity = { x: 0, y: 0 }
      } else if (event.touches.length === 1 && s.initialTouchCount === 1 && !s.isPinching && first) {
        const currentX = first.clientX
        const currentY = first.clientY
        const rawDeltaX = currentX - s.lastMoveCoords.x
        const rawDeltaY = currentY - s.lastMoveCoords.y

        s.velocity = deltaTime > 1 ? { x: rawDeltaX / deltaTime, y: rawDeltaY / deltaTime } : { x: 0, y: 0 }
        s.lastMoveTime = now
        s.lastMoveCoords = { x: currentX, y: currentY }

        const deltaXFromStart = currentX - s.startPan.x
        const deltaYFromStart = currentY - s.startPan.y

        if (
          !s.isPanning &&
          zoomLevel > 100 &&
          (Math.abs(deltaXFromStart) > panThreshold || Math.abs(deltaYFromStart) > panThreshold)
        ) {
          s.isPanning = true
          s.startPan = { x: currentX, y: currentY }
        }

        if (s.isPanning && o.onPanMove) {
          const zoomFactor = zoomLevel / 100
          o.onPanMove(deltaXFromStart / zoomFactor, deltaYFromStart / zoomFactor, event)
        }
      }
      publish()
    }

    const handleTouchEnd = (event: TouchEvent) => {
      const o = latest()
      const zoomLevel = o.zoomLevel ?? 100
      const inertiaDamping = o.inertiaDamping ?? 0.94
      const inertiaVelocityThreshold = o.inertiaVelocityThreshold ?? 0.5
      const minSwipeDistance = o.minSwipeDistance ?? 50
      const maxVerticalSwipeDistance = o.maxVerticalSwipeDistance ?? 75
      const maxTapDuration = o.maxTapDuration ?? 200
      const maxTapMovement = o.maxTapMovement ?? 10

      const touchesLeft = event.touches.length
      const endTime = performance.now()
      const wasPanning = s.isPanning
      const wasPinching = s.isPinching
      const finalVelocity = { ...s.velocity }

      if (wasPanning && s.initialTouchCount > 0 && touchesLeft < s.initialTouchCount) {
        s.isPanning = false
        o.onPanEnd?.(event)

        const magnitude = Math.hypot(finalVelocity.x, finalVelocity.y)
        if (magnitude > inertiaVelocityThreshold && o.onPanAnimate && zoomLevel > 100) {
          s.isAnimatingPan = true
          let lastFrameTime = performance.now()
          const animVelocity = { ...finalVelocity }

          const animate = (currentTime: number) => {
            if (!s.isAnimatingPan) return
            const frameDelta = Math.max(1, currentTime - lastFrameTime)
            lastFrameTime = currentTime
            const live = latest()
            const factor = (live.zoomLevel ?? 100) / 100
            live.onPanAnimate?.((animVelocity.x * frameDelta) / factor, (animVelocity.y * frameDelta) / factor)
            const damping = Math.pow(Math.min(0.999, inertiaDamping), frameDelta / 16.67)
            animVelocity.x *= damping
            animVelocity.y *= damping
            if (Math.hypot(animVelocity.x, animVelocity.y) < 0.01 || (live.zoomLevel ?? 100) <= 100) {
              cancelInertia()
            } else {
              s.frameId = requestAnimationFrame(animate)
            }
          }
          s.frameId = requestAnimationFrame(animate)
        } else {
          s.velocity = { x: 0, y: 0 }
        }
      } else if (!wasPanning) {
        s.velocity = { x: 0, y: 0 }
      }

      if (wasPinching && touchesLeft < 2) {
        s.isPinching = false
        s.touchStartDistance = 0
        o.onPinchEnd?.(event)
      }

      const changed = event.changedTouches[0]
      if (
        touchesLeft === 0 &&
        event.changedTouches.length === 1 &&
        changed &&
        s.touchStartTime > 0 &&
        s.initialTouchCount === 1
      ) {
        const deltaX = changed.clientX - s.startPan.x
        const deltaY = changed.clientY - s.startPan.y
        const duration = endTime - s.touchStartTime

        if (
          !wasPanning &&
          zoomLevel <= 100 &&
          Math.abs(deltaX) > minSwipeDistance &&
          Math.abs(deltaY) < maxVerticalSwipeDistance
        ) {
          if (deltaX < 0) o.onSwipeLeft?.()
          else if (deltaX > 0) o.onSwipeRight?.()
        } else if (
          !wasPanning &&
          duration < maxTapDuration &&
          Math.abs(deltaX) < maxTapMovement &&
          Math.abs(deltaY) < maxTapMovement &&
          o.onTap
        ) {
          o.onTap(event)
        }
      }

      if (touchesLeft === 0) {
        s.touchStartTime = 0
        s.startPan = { x: 0, y: 0 }
        s.initialTouchCount = 0
        s.isPinching = false
        if (!s.isAnimatingPan) s.velocity = { x: 0, y: 0 }
      } else if (touchesLeft === 1 && !s.isPanning && !s.isPinching) {
        const remaining = event.touches[0]
        if (remaining) {
          s.startPan = { x: remaining.clientX, y: remaining.clientY }
          s.touchStartTime = performance.now()
          s.initialTouchCount = 1
        }
      }
      publish()
    }

    target.addEventListener('touchstart', handleTouchStart, { passive: false })
    target.addEventListener('touchmove', handleTouchMove, { passive: false })
    target.addEventListener('touchend', handleTouchEnd, { passive: true })
    target.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      target.removeEventListener('touchstart', handleTouchStart)
      target.removeEventListener('touchmove', handleTouchMove)
      target.removeEventListener('touchend', handleTouchEnd)
      target.removeEventListener('touchcancel', handleTouchEnd)
      if (s.frameId !== null) cancelAnimationFrame(s.frameId)
      s.frameId = null
      s.isAnimatingPan = false
    }
  }, [target, latest])

  return flags
}
