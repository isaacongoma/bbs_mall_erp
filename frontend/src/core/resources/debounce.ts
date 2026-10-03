export interface Debounced<Args extends unknown[], Result> {
  (...args: Args): Promise<Result>
  cancel: () => void
}

export function debounce<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  wait: number,
): Debounced<Args, Result> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let pending: { resolve: (value: Result) => void; reject: (reason: unknown) => void }[] = []

  const debounced = ((...args: Args) =>
    new Promise<Result>((resolve, reject) => {
      pending.push({ resolve, reject })
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        timeout = undefined
        const waiting = pending
        pending = []
        fn(...args).then(
          (value) => waiting.forEach((entry) => entry.resolve(value)),
          (reason) => waiting.forEach((entry) => entry.reject(reason)),
        )
      }, wait)
    })) as Debounced<Args, Result>

  debounced.cancel = () => {
    clearTimeout(timeout)
    timeout = undefined
    pending = []
  }

  return debounced
}
