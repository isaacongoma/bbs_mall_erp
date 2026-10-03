import { __ } from '@/core/i18n'
import { Tooltip } from '@/design-system'
import { formatDate, timeAgo } from '@/shared/utils/date'
import { useTimelinePreferences } from '../../hooks/useTimelinePreferences'

export interface TimelineTimestampProps {
  date?: string | Date
  format?: string
  className?: string
}

export function TimelineTimestamp({
  date = '',
  format = '',
  className = 'text-sm text-ink-gray-5',
}: TimelineTimestampProps) {
  const { showExactTimestamp } = useTimelinePreferences()
  const relative = __(timeAgo(date as string))
  const exact = formatDate(date as string, format || undefined)

  return (
    <Tooltip text={showExactTimestamp ? relative : exact}>
      <div className={className}>{showExactTimestamp ? exact : relative}</div>
    </Tooltip>
  )
}
