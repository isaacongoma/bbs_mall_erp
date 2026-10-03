import { useCallback, useEffect, useRef, useState } from 'react'
import { useLatest } from '../../hooks/useLatest'

export interface UseControlsAutoHideOptions {
  delayMs?: number
  isPaused?: () => boolean
}

export function useControlsAutoHide(options: UseControlsAutoHideOptions = {}) {
  const [isControlsVisible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useLatest(options)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const showAndReset = useCallback(() => {
    setVisible(true)
    clear()
    const delay = latest().delayMs ?? 3000
    const tick = () => {
      if (latest().isPaused?.()) {
        timerRef.current = setTimeout(tick, delay)
      } else {
        setVisible(false)
        timerRef.current = null
      }
    }
    timerRef.current = setTimeout(tick, delay)
  }, [clear, latest])

  useEffect(() => clear, [clear])

  return { isControlsVisible, handleActivity: showAndReset, showAndReset }
}
