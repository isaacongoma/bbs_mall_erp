import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useListResource } from '@/core/resources'
import { Badge, Button, FormControl, toast } from '@/design-system'

type AnyRecord = Record<string, any>

export interface FailureLogsProps {
  source: string
}

export function FailureLogs({ source }: FailureLogsProps) {
  const [selected, setSelected] = useState<AnyRecord | null>(null)
  const [retrying, setRetrying] = useState(false)
  const logs = useListResource({
    doctype: 'Failed Lead Sync Log',
    fields: ['name', 'type', 'lead_data', 'traceback'],
    filters: { source },
    auto: true,
  })
  const rows = (logs.data as AnyRecord[] | null) ?? []

  async function retry() {
    if (!selected) return
    setRetrying(true)
    try {
      await rpc({
        url: `/api/crm/failed-lead-sync-logs/${encodeURIComponent(selected.name)}/retry-sync/`,
        method: 'POST',
      })
      toast.success(__('Sync successful!'))
      setSelected(null)
      void logs.reload()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Error syncing lead'))
    } finally {
      setRetrying(false)
    }
  }

  if (selected) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <Button variant="ghost" iconLeft="lucide-chevron-left" onClick={() => setSelected(null)}>
            {__('Back to All Logs')}
          </Button>
          {selected.type !== 'Synced' && (
            <Button loading={retrying} onClick={() => void retry()}>
              {__('Retry Sync')}
            </Button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <FormControl type="text" label={__('Log ID')} value={selected.name} disabled />
          <FormControl type="text" label={__('Reason')} value={selected.type} disabled />
        </div>
        <div className="mt-4 flex flex-col gap-8">
          <FormControl type="textarea" label={__('Lead Data')} value={selected.lead_data ?? ''} disabled rows={10} />
          {selected.traceback && (
            <FormControl type="textarea" label={__('Traceback')} value={selected.traceback} disabled rows={10} />
          )}
        </div>
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <span className="text-lg-medium text-ink-gray-8">{__('No Failure Logs Found')}</span>
        <span className="text-p-base text-ink-gray-6">{__('Any failed lead syncs will show up here')}</span>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="grid grid-cols-2 border-b px-3 py-2 text-sm text-ink-gray-5">
        <span>{__('ID')}</span>
        <span>{__('Type')}</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid cursor-pointer grid-cols-2 items-center border-b px-3 py-3 hover:bg-surface-gray-2"
          onClick={() => setSelected(row)}
        >
          <span className="text-base">{row.name}</span>
          <span>
            <Badge>{row.type}</Badge>
          </span>
        </div>
      ))}
    </div>
  )
}
