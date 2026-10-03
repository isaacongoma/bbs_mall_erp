import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCallback<Args extends unknown[]>(callback: (...args: Args) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(callback)

  useEffect(() => {
    latest.current = callback
  })

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return useCallback(
    (...args: Args) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => latest.current(...args), delay)
    },
    [delay],
  )
}
