import { useCallback, useEffect, useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

export function useFullscreen() {
  const isFullscreen = useSyncExternalStore(
    subscribe,
    () => Boolean(document.fullscreenElement),
    () => false,
  )

  const toggleFullscreen = useCallback((el: HTMLElement) => {
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.()?.catch(() => undefined)
    } else {
      void document.exitFullscreen?.()?.catch(() => undefined)
    }
  }, [])

  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen?.()?.catch(() => undefined)
    },
    [],
  )

  return { isFullscreen, toggleFullscreen }
}
