import { __ } from '@/core/i18n'
import { ensureSettingsLoaded } from '../stores/settingsStore'
import { formatDate, timeAgo } from '@/shared/utils/date'

export interface TimestampCell {
  label: string
  timeAgo: string
}

export function timestampCell(date: string | Date | null | undefined): TimestampCell {
  if (!date) return { label: '', timeAgo: '' }
  const exact = formatDate(date)
  const relative = __(timeAgo(date))
  const doc = ensureSettingsLoaded().doc as Record<string, any> | null | undefined
  const showExact = doc?.crm_timeline_timestamp_format === 'Exact'
  return {
    label: showExact ? relative : exact,
    timeAgo: showExact ? exact : relative,
  }
}
