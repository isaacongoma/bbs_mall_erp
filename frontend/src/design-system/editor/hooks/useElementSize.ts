import { useCallback, useMemo, useSyncExternalStore } from 'react'

export function useElementSize(target: HTMLElement | null) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!target) return () => undefined
      const observer = new ResizeObserver(onChange)
      observer.observe(target)
      return () => observer.disconnect()
    },
    [target],
  )

  const key = useSyncExternalStore(
    subscribe,
    () => (target ? `${target.offsetWidth}x${target.offsetHeight}` : '0x0'),
    () => '0x0',
  )

  return useMemo(() => {
    const [width = 0, height = 0] = key.split('x').map(Number)
    return { width, height }
  }, [key])
}
