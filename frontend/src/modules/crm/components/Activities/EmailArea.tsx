import { __ } from '@/core/i18n'
import { Badge, Button } from '@/design-system'
import { AttachmentItem } from '@/shared/components/AttachmentItem'
import { EmailContent } from '@/shared/components/EmailContent'
import { ReplyAllIcon, ReplyIcon } from '@/shared/components/Icons'
import { useEmailComposerStore } from '../../stores/emailComposerStore'
import { TimelineTimestamp } from './TimelineTimestamp'

export interface EmailAreaProps {
  activity: Record<string, any>
}

function deliveryStatus(status?: string): { label?: string; color: 'red' | 'green' | 'orange' | 'blue' } {
  let color: 'red' | 'green' | 'orange' | 'blue' = 'red'
  if (['Sent', 'Clicked'].includes(status ?? '')) color = 'green'
  else if (['Sending', 'Scheduled'].includes(status ?? '')) color = 'orange'
  else if (['Opened', 'Read'].includes(status ?? '')) color = 'blue'
  return { label: status, color }
}

export function EmailArea({ activity }: EmailAreaProps) {
  const startReply = useEmailComposerStore((state) => state.startReply)
  const status = deliveryStatus(activity.data?.delivery_status)
  const data = activity.data

  return (
    <div className="flex cursor-pointer flex-col rounded-md bg-surface-elevation-1 px-3 py-1.5 text-base shadow-sm transition-all duration-300 ease-in-out">
      <div className="-mb-0.5 flex items-center justify-between gap-2 truncate text-ink-gray-9">
        <div className="flex items-center gap-2 truncate">
          <span>{data.sender_full_name}</span>
          <span className="hidden text-sm text-ink-gray-5 sm:flex">{`<${data.sender}>`}</span>
          {activity.communication_type === 'Automated Message' && (
            <Badge label={__('Notification')} variant="subtle" theme="green" />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status.label && <Badge label={__(status.label)} variant="subtle" theme={status.color} />}
          <TimelineTimestamp date={activity.communication_date} />
          <div className="flex gap-0.5">
            <Button
              tooltip={__('Reply')}
              variant="ghost"
              className="text-ink-gray-7"
              icon={ReplyIcon}
              onClick={() => startReply(data)}
            />
            <Button
              tooltip={__('Reply All')}
              variant="ghost"
              icon={ReplyAllIcon}
              className="text-ink-gray-7"
              onClick={() => startReply(data, true)}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-base leading-5 text-ink-gray-8">
        <div>{data.subject}</div>
        <div>
          <span className="mr-1 text-ink-gray-5">{__('To')}: </span>
          <span>{data.recipients}</span>
          {data.cc && (
            <>
              <span>, </span>
              <span className="mr-1 text-ink-gray-5">{__('CC')}: </span>
              <span>{data.cc}</span>
            </>
          )}
          {data.bcc && (
            <>
              <span>, </span>
              <span className="mr-1 text-ink-gray-5">{__('BCC')}: </span>
              <span>{data.bcc}</span>
            </>
          )}
        </div>
      </div>
      <div className="mb-1 mt-3 border-0 border-t border-outline-elevation-2" />
      <EmailContent content={data.content} />
      {data.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.attachments.map((attachment: Record<string, any>) => (
            <AttachmentItem key={attachment.file_url} label={attachment.file_name} url={attachment.file_url} />
          ))}
        </div>
      )}
    </div>
  )
}
