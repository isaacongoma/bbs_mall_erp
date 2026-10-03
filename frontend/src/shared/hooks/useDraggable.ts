import { useEffect, useState, type CSSProperties } from 'react'

export interface DraggablePosition {
  x: number
  y: number
}

export function useDraggable(initial: DraggablePosition) {
  const [handle, setHandle] = useState<HTMLElement | null>(null)
  const [position, setPosition] = useState<DraggablePosition>(initial)

  useEffect(() => {
    if (!handle) return
    let delta: DraggablePosition | null = null

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || !handle) return
      const rect = handle.getBoundingClientRect()
      delta = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      event.preventDefault()
    }

    function onPointerMove(event: PointerEvent) {
      if (!delta) return
      setPosition({ x: event.clientX - delta.x, y: event.clientY - delta.y })
      event.preventDefault()
    }

    function onPointerUp() {
      delta = null
    }

    handle.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      handle.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [handle])

  const style: CSSProperties = { left: position.x, top: position.y, touchAction: 'none' }

  return { style, position, setPosition, setHandle }
}
