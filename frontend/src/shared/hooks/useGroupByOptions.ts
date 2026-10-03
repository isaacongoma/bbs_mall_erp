import { useResource } from '@/core/resources'

export interface GroupByOption {
  label: string
  fieldname: string
  [key: string]: unknown
}

export function useGroupByOptions(doctype: string): GroupByOption[] | null {
  const resource = useResource<GroupByOption[]>({
    url: 'crm.api.doc.get_group_by_fields',
    cache: ['groupByOptions', doctype],
    params: { doctype },
    auto: true,
  })
  return resource.data
}
