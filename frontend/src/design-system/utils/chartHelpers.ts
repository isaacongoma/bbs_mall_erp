import { dayjs } from '@/core/datetime'
import type { TimeGrain } from '../types/charts'

export function formatLabel(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function guessPrecision(value: number): number {
  if (!value || isNaN(value)) return 0
  const text = value.toString()
  const decimalIndex = text.indexOf('.')
  if (decimalIndex === -1) return 0
  return Math.min(text.length - decimalIndex - 1, 2)
}

export function formatValue(value: number, precision = 0, shorten = false): string {
  if (isNaN(value)) return String(value)
  const locale = 'en-US'

  if (shorten) {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: precision }).format(value)
  }

  const resolved = precision || guessPrecision(value)
  return new Intl.NumberFormat(locale, { minimumFractionDigits: resolved, maximumFractionDigits: resolved }).format(
    value,
  )
}

const grainFormats: Record<TimeGrain, string> = {
  second: 'MMMM D, YYYY h:mm:ss A',
  minute: 'MMMM D, YYYY h:mm A',
  hour: 'MMMM D, YYYY h:00 A',
  day: 'MMMM D, YYYY',
  week: 'MMM Do, YYYY',
  month: 'MMMM, YYYY',
  year: 'YYYY',
  quarter: '[Q]Q, YYYY',
}

export function formatDate(date: string, format?: string, grain: TimeGrain = 'day'): string {
  if (!date) return ''
  const resolved = grain ? grainFormats[grain] : (format ?? 'MMM D, YY')
  return dayjs(date).format(resolved || 'MMM D, YY')
}

function isObject(item: unknown): item is Record<string, any> {
  return Boolean(item) && typeof item === 'object' && !Array.isArray(item)
}

export function mergeDeep<T extends Record<string, any>>(
  target: T,
  ...sources: (Record<string, any> | undefined)[]
): any {
  if (!sources.length) return target
  const [source, ...rest] = sources
  if (!source || !isObject(target) || !isObject(source)) return mergeDeep(target, ...rest)

  const output: Record<string, any> = Object.assign({}, target)
  for (const key of Object.keys(source)) {
    if (isObject(source[key])) {
      output[key] = key in output ? mergeDeep(output[key], source[key]) : source[key]
    } else {
      output[key] = source[key]
    }
  }
  return mergeDeep(output, ...rest)
}
