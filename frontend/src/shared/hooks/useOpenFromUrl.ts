import { useEffect, useEffectEvent } from 'react'

export function useOpenFromUrl(ready: boolean, onOpen: (value: string) => void): void {
  const open = useEffectEvent(onOpen)

  useEffect(() => {
    if (!ready) return
    const searchParams = new URLSearchParams(window.location.search)
    const value = searchParams.get('open')
    if (!value) return
    open(value)
    searchParams.delete('open')
    window.history.replaceState(null, '', window.location.pathname)
  }, [ready])
}
