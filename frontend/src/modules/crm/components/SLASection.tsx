import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { Badge, Button, Dropdown, Tooltip } from '@/design-system'
import { formatDate, formatTime, timeAgo } from '@/shared/utils/date'
import { useStatuses } from '../hooks/useStatuses'

type AnyRecord = Record<string, any>

export interface SLASectionProps {
  data: AnyRecord
  onUpdateField: (fieldname: string, value: unknown) => void
}

export function SLASection({ data, onUpdateField }: SLASectionProps) {
  const { communicationStatuses } = useStatuses()

  let status: string = data.sla_status
  let tooltipText = status
  let color = status === 'Failed' ? 'red' : status === 'Fulfilled' ? 'green' : 'orange'
  const respondedOn = data.last_responded_on || data.first_responded_on
  const responseTime = data.last_response_time || data.first_response_time

  if (status === 'First Response Due' || status === 'Rolling Response Due') {
    status = timeAgo(data.response_by)
    if (status === 'just now') status = 'In less than a minute'
    tooltipText = formatDate(data.response_by)
    if (new Date(data.response_by) < new Date()) {
      color = 'red'
      if (status === __('In less than a minute')) status = 'less than a minute ago'
    }
  } else if (['Fulfilled', 'Failed'].includes(status)) {
    status = __(status) + ' in ' + formatTime(responseTime)
    tooltipText = formatDate(respondedOn)
  }

  let responseType = 'First Response'
  if (
    Boolean(data.first_responded_on) &&
    Boolean(data.last_responded_on) &&
    (data.sla_status !== 'Fulfilled' || data.first_responded_on !== data.last_responded_on)
  ) {
    responseType = 'Rolling Response'
  }

  const statusOptions = ((communicationStatuses.data as AnyRecord[] | null) ?? []).map((item) => ({
    label: item.name,
    value: item.name,
    onClick: () => {
      capture('sla_status_change')
      onUpdateField('communication_status', item.name)
    },
  }))

  return (
    <div className="flex flex-col gap-1.5 border-b px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2 text-base leading-5">
        <div className="w-36 text-sm text-ink-gray-5 sm:w-[106px]">{__(responseType)}</div>
        <div className="grid min-h-[28px] items-center">
          {tooltipText && (
            <Tooltip text={__(tooltipText)}>
              <div className="ml-2 cursor-pointer">
                <Badge className="-ml-1" label={__(status)} variant="subtle" theme={color as never} />
              </div>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-base leading-5">
        <div className="w-36 text-sm text-ink-gray-5 sm:w-[106px]">{__('Status')}</div>
        <div className="grid min-h-[28px] items-center">
          <Dropdown options={statusOptions}>
            {({ open }) => (
              <Button
                className="form-control bg-surface-base hover:bg-surface-base"
                label={data.communication_status}
                iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
              />
            )}
          </Dropdown>
        </div>
      </div>
    </div>
  )
}
