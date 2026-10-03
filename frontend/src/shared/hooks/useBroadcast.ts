import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'app_broadcasts'

interface StoredBroadcast {
  event: string
  payload: unknown
  timestamp: number
}

function readBroadcasts(): StoredBroadcast[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function sendBroadcast(event: string, payload?: unknown): void {
  window.dispatchEvent(new CustomEvent(event, { detail: payload }))
  const broadcasts = readBroadcasts()
  broadcasts.push({ event, payload, timestamp: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(broadcasts))
}

export function useBroadcast(event: string, handler: (payload: any) => void) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const listener = (e: Event) => handlerRef.current((e as CustomEvent).detail)
    window.addEventListener(event, listener)

    const broadcasts = readBroadcasts()
    const missed = broadcasts.filter((entry) => entry.event === event)
    if (missed.length) {
      missed.forEach((entry) => handlerRef.current(entry.payload))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(broadcasts.filter((entry) => entry.event !== event)))
    }

    return () => window.removeEventListener(event, listener)
  }, [event])

  return { send: sendBroadcast }
}
