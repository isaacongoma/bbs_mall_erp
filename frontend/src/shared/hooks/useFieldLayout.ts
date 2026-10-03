import { createContext, useContext } from 'react'
import type { DocField, DocRecord } from '../types/meta'

type AnyRecord = Record<string, any>

export interface FieldLayoutDocument {
  fieldPropertyOverrides?: Record<string, Partial<DocField>>
  fieldHtmlMap?: Record<string, string>
}

export interface FieldLayoutContextValue {
  data: DocRecord
  doctype: string
  docname: string
  preview: boolean
  isGridRow: boolean
  hasTabs: boolean
  standalone: boolean
  formDocument: FieldLayoutDocument | null
  fieldPropertyOverrides: Record<string, Partial<DocField>>
  parentDoc: DocRecord | null
  parentFieldname: string
  setFieldValue: (fieldname: string, value: unknown) => void
  triggerOnChange: (fieldname: string, value: unknown, row?: AnyRecord | null) => Promise<void> | void
  triggerButton: (fieldname: string, row?: AnyRecord | null) => Promise<void> | void
  triggerOnRowAdd: (row: AnyRecord) => Promise<void> | void
  triggerOnRowRemove: (selectedRows: Set<string>, rows: AnyRecord[]) => Promise<void> | void
}

export const FieldLayoutContext = createContext<FieldLayoutContextValue | null>(null)

export function useFieldLayout(): FieldLayoutContextValue {
  const context = useContext(FieldLayoutContext)
  if (!context) throw new Error('useFieldLayout must be used inside a FieldLayout')
  return context
}

export function useOptionalFieldLayout(): FieldLayoutContextValue | null {
  return useContext(FieldLayoutContext)
}
