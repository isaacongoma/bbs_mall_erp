import { useCallback, useRef, useState } from 'react'

export type PopoverMotion = 'animated' | 'instant'

const DEFAULT_WINDOW_MS = 300

export function usePopoverMotion(windowMs = DEFAULT_WINDOW_MS) {
  const lastPointerDownAt = useRef(0)
  const [motion, setMotion] = useState<PopoverMotion>('animated')

  const onPointerDown = useCallback(() => {
    lastPointerDownAt.current = Date.now()
  }, [])

  const classifyOpen = useCallback(() => {
    setMotion(Date.now() - lastPointerDownAt.current < windowMs ? 'animated' : 'instant')
  }, [windowMs])

  return { motion, onPointerDown, classifyOpen }
}
