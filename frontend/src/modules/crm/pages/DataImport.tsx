import { __ } from '@/core/i18n'
import { useRoute } from '@/core/navigation'
import { usePageMeta } from '@/design-system'
import { DataImportView } from '@/shared/components/DataImport/DataImportView'
import type { DoctypeMap } from '@/shared/utils/dataImport'

const DOCTYPE_MAP: DoctypeMap = {
  'CRM Lead': { title: 'Leads', listRoute: '/leads', pageRoute: '/leads/docname' },
  'CRM Deal': { title: 'Deals', listRoute: '/deals', pageRoute: '/deals/docname' },
  Contact: { title: 'Contacts', listRoute: '/contacts', pageRoute: '/contacts/docname' },
  'CRM Task': { title: 'Tasks', listRoute: '/tasks' },
  'CRM Organization': { title: 'Organizations', listRoute: '/organizations', pageRoute: '/organizations/docname' },
  'CRM Call Log': { title: 'Call Log', listRoute: '/call-logs' },
}

export default function DataImport() {
  const route = useRoute()
  usePageMeta({ title: __('Data Import') })

  return <DataImportView doctype={route.params.doctype} importName={route.params.importName} doctypeMap={DOCTYPE_MAP} />
}
