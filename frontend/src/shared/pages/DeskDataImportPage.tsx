import { useMemo } from 'react'
import { useRoute } from '@/core/navigation'
import { useDoctypeSegment } from '@/shared/frappe/docUrl'
import { useListResource } from '@/core/resources'
import { __ } from '@/core/i18n'
import { usePageMeta } from '@/design-system'
import { DataImportView } from '../components/DataImport/DataImportView'
import type { DoctypeMap, DoctypeOption } from '../utils/dataImport'

const COMMON_DOCTYPES: DoctypeOption[] = [
  { value: 'Employee', label: 'Employee' },
  { value: 'Leave Application', label: 'Leave Application' },
  { value: 'Attendance', label: 'Attendance' },
  { value: 'Expense Claim', label: 'Expense Claim' },
  { value: 'Salary Slip', label: 'Salary Slip' },
  { value: 'Job Applicant', label: 'Job Applicant' },
  { value: 'Sales Invoice', label: 'Sales Invoice' },
  { value: 'Purchase Invoice', label: 'Purchase Invoice' },
  { value: 'Sales Order', label: 'Sales Order' },
  { value: 'Purchase Order', label: 'Purchase Order' },
  { value: 'Item', label: 'Item' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Supplier', label: 'Supplier' },
]

function routeForList(doctype: string) {
  return `/app/${encodeURIComponent(doctype)}`
}

function makeEntry(doctype: string) {
  return {
    title: doctype,
    listRoute: routeForList(doctype),
    pageRoute: `${routeForList(doctype)}/docname`,
  }
}

export default function DeskDataImportPage() {
  const route = useRoute()
  const routedDoctype = useDoctypeSegment(route.params.doctype)
  const doctype = routedDoctype || null
  const importName = route.params.importName ? decodeURIComponent(route.params.importName) : null
  const doctypes = useListResource({
    doctype: 'DocType',
    fields: ['name', 'istable', 'issingle'],
    filters: { istable: 0 },
    orderBy: 'name asc',
    pageLength: 500,
    auto: true,
  })

  const doctypeOptions = useMemo(() => {
    const options = new Map(COMMON_DOCTYPES.map((entry) => [entry.value, entry]))
    for (const row of (doctypes.data ?? []) as Array<Record<string, unknown>>) {
      const name = String(row.name ?? '')
      if (name && Number(row.istable ?? 0) !== 1) options.set(name, { value: name, label: name })
    }
    return [...options.values()].sort((left, right) => left.label.localeCompare(right.label))
  }, [doctypes.data])

  const doctypeMap = useMemo<DoctypeMap>(() => {
    const map: DoctypeMap = {}
    for (const option of doctypeOptions) map[option.value] = makeEntry(option.value)
    if (doctype && !map[doctype]) map[doctype] = makeEntry(doctype)
    return map
  }, [doctype, doctypeOptions])

  usePageMeta({ title: __('Data Import') })

  return (
    <DataImportView doctype={doctype} importName={importName} doctypeMap={doctypeMap} doctypeOptions={doctypeOptions} />
  )
}
