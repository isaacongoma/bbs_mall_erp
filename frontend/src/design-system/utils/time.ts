import { dayjs } from '@/core/datetime'
import type { ParsedTime, ParsedTimeValid, TimeOption } from '../types/time'

const DEFAULT_TIME_FORMAT = 'HH:mm'
const REFERENCE_DATE = '2000-01-01'
const REFERENCE_DATE_FORMAT = 'YYYY-MM-DD'

function formatHasSeconds(format: string): boolean {
  const stripped = format.replace(/\[[^\]]*]/g, '')
  if (stripped.includes('s')) return true
  const withSeconds = dayjs(`${REFERENCE_DATE} 20:02:18`, `${REFERENCE_DATE_FORMAT} HH:mm:ss`, true)
  const withoutSeconds = withSeconds.second(0)
  return withSeconds.format(format) !== withoutSeconds.format(format)
}

function buildParsedTime(hh24: string, mm: string, ss?: string): ParsedTimeValid {
  return { valid: true, hh24, mm, ss, total: parseInt(hh24, 10) * 60 + parseInt(mm, 10) }
}

function parseTimeWithFormat(input: string, format: string): ParsedTime {
  const timeFormat = format || DEFAULT_TIME_FORMAT
  const trimmed = input.trim()
  const candidates = [
    dayjs(trimmed, timeFormat, true),
    dayjs(`${REFERENCE_DATE} ${trimmed}`, `${REFERENCE_DATE_FORMAT} ${timeFormat}`, true),
  ]
  const parsed = candidates.find((candidate) => candidate.isValid())
  if (!parsed) return { valid: false }
  return buildParsedTime(
    parsed.format('HH'),
    parsed.format('mm'),
    formatHasSeconds(timeFormat) ? parsed.format('ss') : undefined,
  )
}

export function parseFlexibleTime(input: string, format = DEFAULT_TIME_FORMAT): ParsedTime {
  if (!input) return { valid: false }
  const formatted = parseTimeWithFormat(input, format)
  if (formatted.valid) return formatted

  let text = input.trim().toLowerCase()
  text = text.replace(/\./g, '')
  text = text.replace(/(\d)(am|pm)$/, '$1 $2')

  const compact = text.match(/^(\d{3,4})\s*([ap]m)?$/)
  if (compact) {
    const digits = compact[1] ?? ''
    const meridiem = compact[2]
    const hours = digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2)
    const minutes = digits.slice(-2)
    text = meridiem ? `${hours}:${minutes} ${meridiem}` : `${hours}:${minutes}`
  }

  const match = text.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\s*([ap]m)?$/)
  if (!match) return { valid: false }
  const [, hourText, minuteText, secondText, meridiem] = match
  let hours = parseInt(hourText ?? '', 10)
  if (isNaN(hours) || hours < 0 || hours > 23) return { valid: false }
  if (secondText && !minuteText) return { valid: false }
  const minutes = minuteText != null && minuteText !== '' ? parseInt(minuteText, 10) : 0
  if (isNaN(minutes) || minutes < 0 || minutes > 59) return { valid: false }
  let seconds: number | undefined
  if (secondText) {
    seconds = parseInt(secondText, 10)
    if (isNaN(seconds) || seconds < 0 || seconds > 59) return { valid: false }
  }
  if (meridiem) {
    if (hours < 1 || hours > 12) return { valid: false }
    if (hours === 12 && meridiem === 'am') hours = 0
    else if (hours < 12 && meridiem === 'pm') hours += 12
  }
  return {
    valid: true,
    hh24: hours.toString().padStart(2, '0'),
    mm: minutes.toString().padStart(2, '0'),
    ss: seconds != null ? seconds.toString().padStart(2, '0') : undefined,
    total: hours * 60 + minutes,
  }
}

export function normalize24(raw: string, format = DEFAULT_TIME_FORMAT): string {
  if (!raw) return ''
  if (/^\d{2}:\d{2}$/.test(raw)) return raw
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw
  const parsed = parseFlexibleTime(raw, format)
  if (!parsed.valid) return ''
  return parsed.ss ? `${parsed.hh24}:${parsed.mm}:${parsed.ss}` : `${parsed.hh24}:${parsed.mm}`
}

export function formatTime(value24: string, format = DEFAULT_TIME_FORMAT): string {
  if (!value24) return ''
  const canonicalFormat = value24.length === 8 ? 'HH:mm:ss' : 'HH:mm'
  const parsed = dayjs(`${REFERENCE_DATE} ${value24}`, `${REFERENCE_DATE_FORMAT} ${canonicalFormat}`, true)
  if (!parsed.isValid()) return value24
  return parsed.format(format || DEFAULT_TIME_FORMAT)
}

export function minutesFromHHMM(text: string): number | null {
  if (!text) return null
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text)) return null
  const [hours, minutes] = text.split(':').map((part) => parseInt(part, 10)) as [number, number]
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function isOutOfRange(total: number, min: number | null, max: number | null): boolean {
  if (min != null && total < min) return true
  if (max != null && total > max) return true
  return false
}

export function generateTimeOptions({
  interval,
  format,
  minMinutes,
  maxMinutes,
}: {
  interval: number
  format?: string
  minMinutes: number | null
  maxMinutes: number | null
}): TimeOption[] {
  const options: TimeOption[] = []
  for (let minute = 0; minute < 1440; minute += interval) {
    if (isOutOfRange(minute, minMinutes, maxMinutes)) continue
    const value = `${Math.floor(minute / 60)
      .toString()
      .padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`
    options.push({ value, label: formatTime(value, format) })
  }
  return options
}

export function findNearestIndex(target: number, options: TimeOption[]): number {
  if (!options.length) return -1
  const minutes = options.map((option) => {
    const [hours, mins] = option.value.split(':').map(Number) as [number, number]
    return hours * 60 + mins
  })
  let low = 0
  let high = minutes.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    const value = minutes[mid] as number
    if (value === target) return mid
    if (value < target) low = mid + 1
    else high = mid - 1
  }
  const candidates: number[] = []
  if (low < minutes.length) candidates.push(low)
  if (low - 1 >= 0) candidates.push(low - 1)
  if (!candidates.length) return -1
  return candidates.sort(
    (a, b) => Math.abs((minutes[a] as number) - target) - Math.abs((minutes[b] as number) - target),
  )[0] as number
}
