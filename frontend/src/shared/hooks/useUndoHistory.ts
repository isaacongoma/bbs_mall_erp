import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLatest } from '@/design-system/hooks/useLatest'

const HISTORY_LIMIT = 50
const COALESCE_MS = 400

export interface UndoHistoryOptions {
  limit?: number
  coalesce?: number
  ignore?: string[]
}

export function useUndoHistory<T extends Record<string, any>>(
  state: T,
  apply: (snapshot: T) => void,
  options: UndoHistoryOptions = {},
) {
  const { limit = HISTORY_LIMIT, coalesce = COALESCE_MS, ignore = [] } = options
  const [past, setPast] = useState<string[]>([])
  const [future, setFuture] = useState<string[]>([])
  const latest = useLatest({ state, apply, ignore, limit, coalesce })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const present = useRef<string | null>(null)
  const pastRef = useRef<string[]>([])
  const futureRef = useRef<string[]>([])

  const read = useCallback((): string => {
    const { state: current, ignore: skipped } = latest()
    const snapshot: Record<string, any> = { ...current }
    skipped.forEach((key) => delete snapshot[key])
    return JSON.stringify(snapshot)
  }, [latest])

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const sync = useCallback((nextPast: string[], nextFuture: string[]) => {
    pastRef.current = nextPast
    futureRef.current = nextFuture
    setPast(nextPast)
    setFuture(nextFuture)
  }, [])

  const record = useCallback(() => {
    clearTimer()
    const next = read()
    if (present.current === null) {
      present.current = next
      return
    }
    if (next === present.current) return
    sync([...pastRef.current, present.current].slice(-latest().limit), [])
    present.current = next
  }, [clearTimer, latest, read, sync])

  const serialized = useMemo(() => {
    const snapshot: Record<string, any> = { ...state }
    ignore.forEach((key) => delete snapshot[key])
    return JSON.stringify(snapshot)
  }, [state, ignore])

  useEffect(() => {
    if (present.current === null) {
      present.current = serialized
      return
    }
    clearTimer()
    timer.current = setTimeout(record, latest().coalesce)
    return clearTimer
  }, [serialized, clearTimer, record, latest])

  const step = useCallback(
    (direction: 'undo' | 'redo') => {
      record()
      const from = direction === 'undo' ? pastRef.current : futureRef.current
      if (!from.length || present.current === null) return
      const to = direction === 'undo' ? futureRef.current : pastRef.current
      const target = from[from.length - 1] as string
      const nextTo = [...to, present.current]
      const nextFrom = from.slice(0, -1)
      present.current = target
      if (direction === 'undo') sync(nextFrom, nextTo)
      else sync(nextTo, nextFrom)
      latest().apply(JSON.parse(target))
    },
    [latest, record, sync],
  )

  const reset = useCallback(() => {
    clearTimer()
    sync([], [])
    present.current = read()
  }, [clearTimer, read, sync])

  const absorb = useCallback(() => {
    clearTimer()
    present.current = read()
  }, [clearTimer, read])

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo: () => step('undo'),
    redo: () => step('redo'),
    flush: record,
    reset,
    absorb,
  }
}
