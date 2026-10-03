import { getSysDefaults } from '@/core/boot'
import { __ } from '@/core/i18n'

interface NumberFormatInfo {
  decimalStr: string
  groupSep: string
  precision: number
}

const NUMBER_FORMAT_INFO: Record<string, { decimalStr: string; groupSep: string }> = {
  '#,###.##': { decimalStr: '.', groupSep: ',' },
  '#.###,##': { decimalStr: ',', groupSep: '.' },
  '# ###.##': { decimalStr: '.', groupSep: ' ' },
  '# ###,##': { decimalStr: ',', groupSep: ' ' },
  "#'###.##": { decimalStr: '.', groupSep: "'" },
  '#, ###.##': { decimalStr: '.', groupSep: ', ' },
  '#,##,###.##': { decimalStr: '.', groupSep: ',' },
  '#,###.###': { decimalStr: '.', groupSep: ',' },
  '#.###': { decimalStr: '', groupSep: '.' },
  '#,###': { decimalStr: '', groupSep: ',' },
}

export function replaceAll(s: string, t1: string, t2: string): string {
  return s.split(t1).join(t2)
}

export function lstrip(s: string, chars: string[] = ['\n', '\t', ' ']): string {
  let result = s
  while (result.length && chars.includes(result.charAt(0))) result = result.slice(1)
  return result
}

export function rstrip(s: string, chars: string[] = ['\n', '\t', ' ']): string {
  let result = s
  while (result.length && chars.includes(result.charAt(result.length - 1))) result = result.slice(0, -1)
  return result
}

export function strip(s: string | null | undefined, chars?: string[]): string | undefined {
  if (!s) return undefined
  return rstrip(lstrip(s, chars), chars)
}

export function cstr(s: unknown): string {
  if (s == null) return ''
  return `${s}`
}

export function cint(v: unknown, def?: number): number {
  if (v === true) return 1
  if (v === false) return 0
  let text = `${v}`
  if (text !== '0') text = lstrip(text, ['0'])
  const parsed = parseInt(text)
  if (Number.isNaN(parsed)) return def === undefined ? 0 : def
  return parsed
}

function getNumberFormat(format: string | null = null): string {
  return format || getSysDefaults().number_format || '#,###.##'
}

function getNumberFormatInfo(format: string): NumberFormatInfo {
  const base = NUMBER_FORMAT_INFO[format] ?? { decimalStr: '.', groupSep: ',' }
  const precision = format.split(base.decimalStr).slice(1)[0]?.length ?? 0
  return { ...base, precision }
}

function stripNumberGroups(v: string, numberFormat?: string | null): string {
  const info = getNumberFormatInfo(numberFormat || getNumberFormat())
  const groupRegex = new RegExp(info.groupSep === '.' ? '\\.' : info.groupSep, 'g')
  let result = v.replace(groupRegex, '')
  if (info.decimalStr !== '.' && info.decimalStr !== '') {
    result = result.replace(new RegExp(info.decimalStr, 'g'), '.')
  }
  return result
}

function roundNumber(num: number, precision: number | null | undefined, roundingMethod?: string): number {
  const method = roundingMethod || getSysDefaults().rounding_method || "Banker's Rounding (legacy)"
  const isNegative = num < 0

  if (method === "Banker's Rounding (legacy)") {
    const d = cint(precision)
    const m = Math.pow(10, d)
    const n = +(d ? Math.abs(num) * m : Math.abs(num)).toFixed(8)
    const i = Math.floor(n)
    const f = n - i
    let r = !precision && f === 0.5 ? (i % 2 === 0 ? i : i + 1) : Math.round(n)
    r = d ? r / m : r
    return isNegative ? -r : r
  }

  if (method === "Banker's Rounding") {
    if (num === 0) return 0
    const digits = cint(precision)
    const multiplier = Math.pow(10, digits)
    let scaled = Math.abs(num) * multiplier
    const floorNum = Math.floor(scaled)
    const decimalPart = scaled - floorNum
    const epsilon = 2.0 ** (Math.log2(Math.abs(scaled)) - 52.0)
    scaled = Math.abs(decimalPart - 0.5) < epsilon ? (floorNum % 2 === 0 ? floorNum : floorNum + 1) : Math.round(scaled)
    const result = scaled / multiplier
    return isNegative ? -result : result
  }

  if (method === 'Commercial Rounding') {
    if (num === 0) return 0
    const multiplier = Math.pow(10, cint(precision))
    const scaled = num * multiplier
    let epsilon = 2.0 ** (Math.log2(Math.abs(scaled)) - 52.0)
    if (isNegative) epsilon = -1 * epsilon
    return Math.round(scaled + epsilon) / multiplier
  }

  throw new Error(`Unknown rounding method ${method}`)
}

export function flt(
  v: unknown,
  decimals?: number | null,
  numberFormat?: string | null,
  roundingMethod?: string,
): number {
  if (v == null || v === '') return 0
  let value: number

  if (typeof v === 'number') {
    value = v
  } else {
    let text = `${v}`
    if (text.indexOf(' ') !== -1) {
      const parts = text.split(' ')
      text = Number.isNaN(parseFloat(parts[0] ?? '')) ? parts.slice(parts.length - 1).join(' ') : text
    }
    text = stripNumberGroups(text, numberFormat)
    value = parseFloat(text)
    if (Number.isNaN(value)) value = 0
  }

  if (decimals != null) return roundNumber(value, decimals, roundingMethod)
  return value
}

export function formatNumber(value: unknown, format?: string | null, decimals?: number | null): string {
  let resolvedFormat = format
  let precision = decimals
  if (!resolvedFormat) {
    resolvedFormat = getNumberFormat()
    if (precision == null) precision = cint(getSysDefaults().float_precision || 3)
  }

  const info = getNumberFormatInfo(resolvedFormat)
  if (precision == null) precision = info.precision

  let numeric = flt(value, precision, resolvedFormat)
  const isNegative = numeric < 0
  numeric = Math.abs(numeric)

  const fixed = numeric.toFixed(precision)
  const part = fixed.split('.')
  let groupPosition = info.groupSep ? 3 : 0

  if (groupPosition) {
    const integer = part[0] ?? ''
    let str = ''
    for (let i = integer.length; i >= 0; i--) {
      let l = replaceAll(str, info.groupSep, '').length
      if (resolvedFormat === '#,##,###.##' && str.indexOf(',') !== -1) {
        groupPosition = 2
        l += 1
      }
      str += integer.charAt(i)
      if (l && !((l + 1) % groupPosition) && i !== 0) str += info.groupSep
    }
    part[0] = str.split('').reverse().join('')
  }
  if (`${part[0]}` === '') part[0] = '0'

  const decimalPart = part[1] && info.decimalStr ? info.decimalStr + part[1] : ''
  return (isNegative ? '-' : '') + part[0] + decimalPart
}

export function formatCompactNumber(value: unknown, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits }).format(flt(value))
}

function getCurrencySymbol(currencyCode: string): string | null {
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    const symbol = formatter.formatToParts(1).find((part) => part.type === 'currency')
    return symbol ? symbol.value : null
  } catch {
    console.error(`Invalid currency code: ${currencyCode}`)
    return null
  }
}

export function formatCurrency(
  value: unknown,
  format?: string | null,
  currency: string | null = 'USD',
  precision: number | string | null = 2,
): string {
  const amount = value == null || value === '' ? 0 : value
  const resolvedPrecision =
    typeof precision === 'number' ? precision : cint(precision || getSysDefaults().currency_precision || 2)
  const resolvedFormat = getNumberFormat(format ?? null)

  if (currency) {
    const symbol = getCurrencySymbol(currency)
    if (symbol) return `${__(symbol)} ${formatNumber(amount, resolvedFormat, resolvedPrecision)}`
  }
  return formatNumber(amount, resolvedFormat, resolvedPrecision)
}
