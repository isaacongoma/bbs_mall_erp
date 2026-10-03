import { useCallback, useEffect, useRef, useState } from 'react'

interface Counters {
  hours: number
  minutes: number
  seconds: number
}

function format(counters: Counters): string {
  let minutesCount: number | string = counters.minutes
  let secondsCount: number | string = counters.seconds < 10 ? `0${counters.seconds}` : counters.seconds
  const hoursCount = counters.hours > 0 ? `${counters.hours}:` : ''

  if (hoursCount) {
    minutesCount = minutesCount < 10 ? `0${minutesCount}` : minutesCount
    secondsCount = counters.seconds < 10 ? `0${counters.seconds}` : counters.seconds
    if (minutesCount === 0) minutesCount = '00'
  }
  return `${hoursCount}${minutesCount}:${secondsCount}`
}

export function useCountUpTimer() {
  const counters = useRef<Counters>({ hours: 0, minutes: 0, seconds: 0 })
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [updatedTime, setUpdatedTime] = useState('0:00')
  const updatedRef = useRef('0:00')

  const getTime = useCallback((initialSeconds: number | string = 0): string => {
    const c = counters.current
    if (initialSeconds) {
      c.seconds = typeof initialSeconds === 'string' ? parseInt(initialSeconds) : initialSeconds
      if (c.seconds >= 60) {
        c.minutes = Math.floor(c.seconds / 60)
        c.seconds = c.seconds % 60
      } else {
        c.minutes = 0
      }
      if (c.minutes >= 60) {
        c.hours = Math.floor(c.minutes / 60)
        c.minutes = c.minutes % 60
      } else {
        c.hours = 0
      }
    }

    if (c.seconds === 59) {
      c.seconds = 0
      c.minutes += 1
      c.seconds--
    }
    if (c.minutes === 60) {
      c.minutes = 0
      c.hours += 1
    }
    c.seconds++
    return format(c)
  }, [])

  const start = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      const next = getTime()
      updatedRef.current = next
      setUpdatedTime(next)
    }, 1000)
  }, [getTime])

  const stop = useCallback((): string => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    const output = updatedRef.current
    counters.current = { hours: 0, minutes: 0, seconds: 0 }
    updatedRef.current = '0:00'
    setUpdatedTime('0:00')
    return output
  }, [])

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
    },
    [],
  )

  return { start, stop, getTime, updatedTime }
}
