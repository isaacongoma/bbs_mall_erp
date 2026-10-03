import { useMemo } from 'react'
import { useResource } from '@/core/resources'

export interface SortOption {
  label: string
  fieldname: string
  value: string
  [key: string]: unknown
}

export function useSortOptions(doctype: string): SortOption[] {
  const resource = useResource<Array<{ label: string; fieldname: string }>>({
    url: 'crm.api.doc.sort_options',
    cache: ['sortOptions', doctype],
    params: { doctype },
    auto: true,
  })
  const data = resource.data
  return useMemo(() => (data ?? []).map((option) => ({ ...option, value: option.fieldname })), [data])
}
