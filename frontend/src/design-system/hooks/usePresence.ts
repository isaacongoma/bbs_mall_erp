import { useEffect, useState } from 'react'

export type PresenceState = 'entering' | 'present' | 'leaving'

export function usePresence(visible: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(visible)
  const [previousVisible, setPreviousVisible] = useState(visible)

  if (previousVisible !== visible) {
    setPreviousVisible(visible)
    if (visible) setMounted(true)
  }

  useEffect(() => {
    if (visible || !mounted) return
    const timer = setTimeout(() => setMounted(false), exitMs)
    return () => clearTimeout(timer)
  }, [visible, mounted, exitMs])

  return { mounted, state: visible ? ('present' as const) : ('leaving' as const) }
}
