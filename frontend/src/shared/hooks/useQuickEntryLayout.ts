import { useEffect, useEffectEvent } from 'react'
import { useResource } from '@/core/resources'
import type { LayoutTab } from '../components/FieldLayout'
import { collectLayoutFields } from '../utils/quickEntry'

const GET_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout'

export function useQuickEntryLayout(
  doctype: string,
  document: { setField: (fieldname: string, value: unknown) => void },
): LayoutTab[] | null {
  const layout = useResource<LayoutTab[]>({
    url: GET_LAYOUT,
    cache: ['QuickEntry', doctype],
    params: { doctype, type: 'Quick Entry' },
    auto: true,
  })

  const tabs = layout.data ?? null

  const initTables = useEffectEvent((loaded: LayoutTab[]) => {
    for (const field of collectLayoutFields(loaded)) {
      if (field.fieldtype === 'Table') document.setField(field.fieldname, [])
    }
  })

  useEffect(() => {
    if (tabs) initTables(tabs)
  }, [tabs])

  return tabs
}
