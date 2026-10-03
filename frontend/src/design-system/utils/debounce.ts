export interface Debounced<Args extends unknown[]> {
  (...args: Args): void
  cancel: () => void
  flush: () => void
}

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, wait: number): Debounced<Args> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let pending: Args | null = null

  const run = () => {
    timeout = undefined
    if (pending) {
      const args = pending
      pending = null
      fn(...args)
    }
  }

  const debounced = ((...args: Args) => {
    pending = args
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(run, wait)
  }) as Debounced<Args>

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout)
    timeout = undefined
    pending = null
  }

  debounced.flush = () => {
    if (timeout) clearTimeout(timeout)
    run()
  }

  return debounced
}
