import { useObservable } from '@/core/resources'
import { ensureSettingsLoaded } from '../stores/settingsStore'

export function useTimelinePreferences() {
  const resource = ensureSettingsLoaded()
  useObservable(resource)
  const doc = resource.doc as Record<string, any> | null | undefined

  const timestampFormat: string = doc?.crm_timeline_timestamp_format || 'Relative'
  const sortOrder: string = doc?.crm_timeline_sort_order || 'Oldest First'

  return {
    timestampFormat,
    sortOrder,
    showExactTimestamp: timestampFormat === 'Exact',
    isNewestFirst: sortOrder === 'Newest First',
  }
}
