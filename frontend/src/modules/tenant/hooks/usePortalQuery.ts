import { useCallback, useEffect, useRef, useState } from 'react'
import { usePortalStore } from '../stores/portalStore'

interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  setData: (value: T | null) => void
}

export function usePortalQuery<T>(
  fetcher: (customer: string | undefined) => Promise<T>,
  deps: unknown[] = [],
): QueryState<T> {
  const customer = usePortalStore((state) => state.customer)
  const ready = usePortalStore((state) => Boolean(state.context))
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const latest = useRef(fetcher)
  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    latest.current = fetcher
  })

  useEffect(() => {
    if (!ready) return undefined
    let live = true
    Promise.resolve()
      .then(() => {
        if (!live) return undefined
        setLoading(true)
        return latest.current(customer)
      })
      .then((value) => {
        if (!live || value === undefined) return
        setData(value)
        setError(null)
        setLoading(false)
      })
      .catch((caught: unknown) => {
        if (!live) return
        setError(caught instanceof Error ? caught.message : String(caught))
        setLoading(false)
      })
    return () => {
      live = false
    }
  }, [ready, customer, tick, depsKey])

  const reload = useCallback(() => setTick((value) => value + 1), [])
  return { data, loading, error, reload, setData }
}
