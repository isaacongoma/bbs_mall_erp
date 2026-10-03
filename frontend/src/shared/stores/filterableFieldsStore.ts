import { create } from 'zustand'
import { rpc } from '@/core/api/rpc'
import type { FilterableField } from '../types/conditions'

interface FilterableFieldsState {
  fieldsByDoctype: Record<string, FilterableField[]>
}

export const useFilterableFieldsStore = create<FilterableFieldsState>(() => ({ fieldsByDoctype: {} }))

const requested = new Set<string>()

export async function loadFilterableFields(doctype: string, force = false): Promise<void> {
  if (!doctype) return
  if (!force && requested.has(doctype)) return
  requested.add(doctype)
  try {
    const data = await rpc<Array<Record<string, any>>>({
      url: 'crm.api.doc.get_filterable_fields',
      params: { doctype },
    })
    const fields = (data ?? [])
      .filter((field) => !String(field.fieldname).startsWith('_'))
      .map(({ description: _description, ...field }) => ({
        label: field.label,
        value: field.fieldname,
        ...field,
      })) as FilterableField[]
    useFilterableFieldsStore.setState((state) => ({
      fieldsByDoctype: { ...state.fieldsByDoctype, [doctype]: fields },
    }))
  } catch (error) {
    requested.delete(doctype)
    throw error
  }
}
