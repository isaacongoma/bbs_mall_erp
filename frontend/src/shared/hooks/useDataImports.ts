import { useState } from 'react'
import { useListResource } from '@/core/resources'
import type { DataImportStatus } from '../utils/dataImport'

export function useDataImports() {
  const [status, setStatus] = useState<'All' | DataImportStatus>('All')

  const list = useListResource({
    doctype: 'Data Import',
    fields: [
      'name',
      'reference_doctype',
      'import_type',
      'status',
      'creation',
      'mute_emails',
      'import_file',
      'google_sheets_url',
      'template_options',
    ],
    orderBy: 'modified desc',
    auto: true,
  })

  function filterByStatus(next: 'All' | DataImportStatus) {
    setStatus(next)
    list.update({ filters: next === 'All' ? {} : { status: next } })
    void list.reload().catch(() => undefined)
  }

  return { list, status, filterByStatus }
}
