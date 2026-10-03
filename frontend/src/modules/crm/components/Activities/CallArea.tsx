import { useState } from 'react'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Avatar, Badge } from '@/design-system'
import { AudioPlayer } from '@/shared/components/AudioPlayer'
import { CalendarIcon, DurationIcon, PlayIcon } from '@/shared/components/Icons'
import { MultipleAvatar } from '@/shared/components/MultipleAvatar'
import { formatDate } from '@/shared/utils/date'
import { getCallStatusLabel, statusColorMap } from '../../utils/callLog'
import { CallLogDetailModal } from '../CallLogDetailModal'
import { TimelineTimestamp } from './TimelineTimestamp'

export interface CallAreaProps {
  activity: Record<string, any>
  className?: string
}

export function CallArea({ activity: call, className }: CallAreaProps) {
  const [showRecording, setShowRecording] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const callLog = useResource<Record<string, any>>({
    url: 'crm.fcrm.doctype.crm_call_log.crm_call_log.get_call_log',
    params: { name: call.name },
    cache: ['call_log', call.name],
    auto: true,
  })

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-stretch gap-2 py-1 text-base">
        <div className="inline-flex flex-wrap items-center gap-1 text-ink-gray-5">
          <Avatar image={call._caller.image} label={call._caller.label} size="md" />
          <span className="ml-1 font-medium text-ink-gray-8">{call._caller.label}</span>
          <span>{call.type === 'Incoming' ? __('has reached out') : __('has made a call')}</span>
        </div>
        <div className="ml-auto whitespace-nowrap">
          <TimelineTimestamp date={call.creation} />
        </div>
      </div>
      <div
        className="flex cursor-pointer flex-col gap-2 rounded-md border border-outline-elevation-2 bg-surface-elevation-1 px-3 py-2.5 text-ink-gray-9"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-base-medium">
            <div>{call.type === 'Incoming' ? __('Inbound Call') : __('Outbound Call')}</div>
          </div>
          <div>
            <MultipleAvatar
              avatars={[
                { image: call._caller.image, label: call._caller.label, name: call._caller.label },
                { image: call._receiver.image, label: call._receiver.label, name: call._receiver.label },
              ]}
              size="sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={formatDate(call.creation, 'MMM D, dddd')} prefix={<CalendarIcon className="size-3" />} />
          {call.status === 'Completed' && <Badge label={call._duration} prefix={<DurationIcon className="size-3" />} />}
          {call.recording_url && (
            <Badge
              label={showRecording ? __('Hide Recording') : __('Listen')}
              className="cursor-pointer"
              prefix={<PlayIcon className="size-3" />}
              onClick={(event) => {
                event.stopPropagation()
                setShowRecording((current) => !current)
              }}
            />
          )}
          <Badge label={getCallStatusLabel(call.status, call.type)} theme={statusColorMap[call.status] as never} />
        </div>
        {showRecording && call.recording_url && callLog.data?.recording_url_path && (
          <div className="flex flex-col items-center justify-between" onClick={(event) => event.stopPropagation()}>
            <AudioPlayer src={callLog.data.recording_url_path} />
          </div>
        )}
      </div>
      <CallLogDetailModal open={showDetail} onOpenChange={setShowDetail} callLog={callLog} />
    </div>
  )
}
