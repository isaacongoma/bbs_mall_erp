import { useState } from 'react'
import { createResource, type Resource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { DocListPage } from '@/shared/components/DocListPage'
import { useOpenFromUrl } from '@/shared/hooks/useOpenFromUrl'
import { useUiStore } from '@/shared/stores/uiStore'
import { CallLogDetailModal } from '../components/CallLogDetailModal'
import { PhoneIcon } from '@/shared/components/Icons'
import { useSettings } from '../hooks/useSettings'
import { getCallLogDetail } from '../utils/callLog'
import { callLogsListConfig } from '../utils/listConfigs'

type AnyRecord = Record<string, any>

export default function CallLogs() {
  const { brand } = useSettings()
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const [showDetail, setShowDetail] = useState(false)
  const [callLog, setCallLog] = useState<Resource<AnyRecord, AnyRecord> | null>(null)

  function showCallLog(name: string) {
    setCallLog(
      createResource({
        url: 'crm.fcrm.doctype.crm_call_log.crm_call_log.get_call_log',
        params: { name },
        cache: ['call_log', name],
        auto: true,
      }),
    )
    setShowDetail(true)
  }

  useOpenFromUrl(true, showCallLog)

  return (
    <DocListPage
      routeName="Call Logs"
      doctype="CRM Call Log"
      emptyName="Call Logs"
      emptyIcon={PhoneIcon}
      config={callLogsListConfig(showCallLog)}
      brandFavicon={brand.favicon}
      rows={{ flat: true, rowCell: (row, record, columns) => getCallLogDetail(row, record, columns) }}
      onCreate={(controller) =>
        showDoctypeModal({
          doctype: 'CRM Call Log',
          title: 'Call Log',
          callbacks: {
            afterInsert: () => {
              capture('call_log_created')
              void controller.list.reload().catch(() => undefined)
            },
          },
        })
      }
      modals={callLog && <CallLogDetailModal open={showDetail} onOpenChange={setShowDetail} callLog={callLog} />}
    />
  )
}
