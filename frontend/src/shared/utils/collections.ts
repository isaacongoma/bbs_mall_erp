export function sameArrayContents(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  if (a.length === 0) return true

  const counts = new Map<unknown, number>()
  for (const value of a) counts.set(value, (counts.get(value) || 0) + 1)
  for (const value of b) {
    const count = counts.get(value)
    if (!count) return false
    if (count === 1) counts.delete(value)
    else counts.set(value, count - 1)
  }
  return counts.size === 0
}

export function orderSensitiveEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function runSequentially(functions: Array<() => unknown>): Promise<unknown> {
  return functions.reduce<Promise<unknown>>((promise, fn) => promise.then(() => fn()), Promise.resolve())
}

export function convertArrayToString(array: unknown[]): string {
  return array.map((item) => item).join(',')
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T

  const cloned: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) cloned[key] = deepClone((obj as Record<string, unknown>)[key])
  }
  return cloned as T
}

export function copy<T>(obj: T): T {
  if (!obj) return obj
  return JSON.parse(JSON.stringify(obj)) as T
}

export function getGridTemplateColumnsForTable(columns: Array<{ width?: number | string }>): string {
  const widths = columns
    .map((column) => {
      const width = column.width || 1
      return typeof width === 'number' ? `${width}fr` : width
    })
    .join(' ')
  return `${widths} 22px`
}
