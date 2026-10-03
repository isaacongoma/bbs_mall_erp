import { useCallback, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((previous: T) => T)) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  )

  let value = initialValue
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      value = initialValue
    }
  }

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      let current = initialValue
      const stored = read(key)
      if (stored !== null) {
        try {
          current = JSON.parse(stored) as T
        } catch {
          current = initialValue
        }
      }
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current) : next
      try {
        localStorage.setItem(key, JSON.stringify(resolved))
      } catch {
        return
      }
      listeners.forEach((listener) => listener())
    },
    [key, initialValue],
  )

  return [value, setValue]
}
