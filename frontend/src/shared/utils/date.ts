import { getSysDefaults } from '@/core/boot'
import { dayjs, dayjsLocal } from '@/core/datetime'
import { __ } from '@/core/i18n'
import { getConfig } from '@/core/resources/config'

export function formatTime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  let formatted = ''
  if (days > 0) formatted += `${days}d `
  if (hours > 0 || days > 0) formatted += `${hours}h `
  if (minutes > 0 || hours > 0 || days > 0) formatted += `${minutes}m `
  formatted += `${remainingSeconds}s`
  return formatted.trim()
}

export function getFormat(
  date: string | Date | null | undefined,
  format?: string | null,
  onlyDate = false,
  onlyTime = false,
  withDate = true,
): string {
  if (!date && withDate) return ''
  const sys = getSysDefaults()
  const dateFormat = sys.date_format.replace('mm', 'MM').replace('yyyy', 'YYYY').replace('dd', 'DD') || 'YYYY-MM-DD'
  const timeFormat = sys.time_format || 'HH:mm:ss'
  let resolved = format || 'ddd, MMM D, YYYY h:mm a'

  if (onlyDate) resolved = dateFormat
  if (onlyTime) resolved = timeFormat
  if (onlyTime && onlyDate) resolved = `${dateFormat} ${timeFormat}`

  if (withDate) return dayjs(date).format(resolved)
  return resolved
}

export function formatDate(
  date: string | Date | null | undefined,
  format?: string | null,
  onlyDate = false,
  onlyTime = false,
): string {
  if (!date) return ''
  const resolved = getFormat(date, format, onlyDate, onlyTime, false)
  return dayjsLocal(date as string).format(resolved)
}

export function formatDuration(totalSeconds: unknown, longForm = false): string {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds === '') return ''
  const s = parseInt(String(totalSeconds), 10)
  if (Number.isNaN(s)) return ''
  if (s === 0) return longForm ? '0 seconds' : '0s'

  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts: string[] = []

  if (longForm) {
    if (h) parts.push(h === 1 ? '1 hour' : `${h} hours`)
    if (m) parts.push(m === 1 ? '1 minute' : `${m} minutes`)
    if (sec) parts.push(sec === 1 ? '1 second' : `${sec} seconds`)
    return parts.join(' ')
  }

  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (sec) parts.push(`${sec}s`)
  return parts.join(' ')
}

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function miniFuture(dayDiff: number, diff: number): string | null {
  const abs = Math.abs(dayDiff)
  if (abs < 1) {
    if (Math.abs(diff) < 60) return __('now')
    if (Math.abs(diff) < 3600) return __('in {0} m', [Math.floor(Math.abs(diff) / 60)])
    if (Math.abs(diff) < 86400) return __('in {0} h', [Math.floor(Math.abs(diff) / 3600)])
  }
  if (abs >= 1 && abs < 1.5) return __('tomorrow')
  if (abs < 7) return __('in {0} d', [Math.floor(abs)])
  if (abs < 31) return __('in {0} w', [Math.floor(abs / 7)])
  if (abs < 365) return __('in {0} M', [Math.floor(abs / 30)])
  return __('in {0} y', [Math.floor(abs / 365)])
}

function miniPast(dayDiff: number, diff: number): string | null {
  if (dayDiff >= 0 && dayDiff < 1) {
    if (diff < 60) return __('now')
    if (diff < 3600) return __('{0} m', [Math.floor(diff / 60)])
    if (diff < 86400) return __('{0} h', [Math.floor(diff / 3600)])
    return null
  }
  const days = Math.floor(dayDiff)
  if (days < 7) return __('{0} d', [days])
  if (days < 31) return __('{0} w', [Math.floor(days / 7)])
  if (days < 365) return __('{0} M', [Math.floor(days / 30)])
  return __('{0} y', [Math.floor(days / 365)])
}

function longFuture(dayDiff: number, diff: number): string | null {
  const abs = Math.abs(dayDiff)
  if (abs < 1) {
    if (Math.abs(diff) < 60) return __('just now')
    if (Math.abs(diff) < 120) return __('in 1 minute')
    if (Math.abs(diff) < 3600) return __('in {0} minutes', [Math.floor(Math.abs(diff) / 60)])
    if (Math.abs(diff) < 7200) return __('in 1 hour')
    if (Math.abs(diff) < 86400) return __('in {0} hours', [Math.floor(Math.abs(diff) / 3600)])
  }
  if (abs >= 1 && abs < 1.5) return __('tomorrow')
  if (abs < 7) return __('in {0} days', [Math.floor(abs)])
  if (abs < 31) return __('in {0} weeks', [Math.floor(abs / 7)])
  if (abs < 365) return __('in {0} months', [Math.floor(abs / 30)])
  if (abs < 730) return __('in 1 year')
  return __('in {0} years', [Math.floor(abs / 365)])
}

function longPast(dayDiff: number, diff: number): string | null {
  if (dayDiff >= 0 && dayDiff < 1) {
    if (diff < 60) return __('just now')
    if (diff < 120) return __('1 minute ago')
    if (diff < 3600) return __('{0} minutes ago', [Math.floor(diff / 60)])
    if (diff < 7200) return __('1 hour ago')
    if (diff < 86400) return __('{0} hours ago', [Math.floor(diff / 3600)])
    return null
  }
  const days = Math.floor(dayDiff)
  if (days === 1) return __('yesterday')
  if (days < 7) return __('{0} days ago', [days])
  if (days < 14) return __('1 week ago')
  if (days < 31) return __('{0} weeks ago', [Math.floor(days / 7)])
  if (days < 62) return __('1 month ago')
  if (days < 365) return __('{0} months ago', [Math.floor(days / 30)])
  if (days < 730) return __('1 year ago')
  return __('{0} years ago', [Math.floor(days / 365)])
}

export function prettyDate(date: string | Date | null | undefined, mini = false): string {
  if (!date) return ''

  const systemTimezone = getConfig('systemTimezone')
  const localTimezone = getConfig('localTimezone') || getBrowserTimezone()
  const parsed = typeof date === 'string' ? dayjsLocal(date) : date

  const now = dayjs().tz(localTimezone || systemTimezone || undefined)
  const diff = now.diff(parsed, 'seconds')
  const dayDiff = diff / 86400
  if (Number.isNaN(dayDiff)) return ''

  if (mini) return (dayDiff < 0 ? miniFuture(dayDiff, diff) : miniPast(dayDiff, diff)) ?? ''
  return (dayDiff < 0 ? longFuture(dayDiff, diff) : longPast(dayDiff, diff)) ?? ''
}

export function timeAgo(date: string | Date | null | undefined): string {
  return prettyDate(date)
}
