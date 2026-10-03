import { __ } from '@/core/i18n'
import { getMeta } from '@/shared/stores/metaStore'
import { formatDate } from '@/shared/utils/date'
import { timestampCell } from './timestampCell'

export const statusLabelMap: Record<string, string> = {
  Completed: __('Completed'),
  Initiated: __('Initiated'),
  Busy: __('Declined'),
  Failed: __('Failed'),
  Queued: __('Queued'),
  Canceled: __('Canceled'),
  Ringing: __('Ringing'),
  'No Answer': __('No Answer'),
  'In Progress': __('In Progress'),
}

export const statusColorMap: Record<string, string> = {
  Completed: 'green',
  Busy: 'orange',
  Failed: 'red',
  Initiated: 'gray',
  Queued: 'gray',
  Canceled: 'gray',
  Ringing: 'gray',
  'No Answer': 'red',
  'In Progress': 'blue',
}

export function getCallStatusLabel(status: string, type: string): string | undefined {
  if (status === 'No Answer' && type === 'Incoming') return __('Missed Call')
  return statusLabelMap[status]
}

interface ColumnLike {
  key?: string
  value?: string
  type?: string
}

export function getCallLogDetail(row: string, log: Record<string, any>, columns: ColumnLike[] = []): unknown {
  const incoming = log.type === 'Incoming'

  if (row === 'duration') return { label: log._duration, icon: 'clock' }
  if (row === 'caller') return { name: log.caller, label: log._caller?.label, image: log._caller?.image }
  if (row === 'receiver') return { name: log.receiver, label: log._receiver?.label, image: log._receiver?.image }
  if (row === 'type') return { label: log.type, icon: incoming ? 'phone-incoming' : 'phone-outgoing' }
  if (row === 'status') return { label: getCallStatusLabel(log.status, log.type), color: statusColorMap[log.status] }
  if (['modified', 'creation'].includes(row)) return timestampCell(log[row])

  const fieldType = columns?.find((column) => (column.key || column.value) === row)?.type
  const meta = getMeta('CRM Call Log')

  if (fieldType && ['Date', 'Datetime'].includes(fieldType))
    return formatDate(log[row], '', true, fieldType === 'Datetime')
  if (fieldType === 'Currency') return meta.getFormattedCurrency(row, log)
  if (fieldType === 'Float') return meta.getFormattedFloat(row, log)
  if (fieldType === 'Percent') return meta.getFormattedPercent(row, log)

  return log[row]
}
