import { useEffect } from 'react'
import { loadFilterableFields, useFilterableFieldsStore } from '../stores/filterableFieldsStore'
import type { FilterableField } from '../types/conditions'

const EMPTY: FilterableField[] = []

export function useFilterableFields(doctype: string): FilterableField[] {
  const fields = useFilterableFieldsStore((state) => state.fieldsByDoctype[doctype])

  useEffect(() => {
    void loadFilterableFields(doctype).catch(() => undefined)
  }, [doctype])

  return fields ?? EMPTY
}
