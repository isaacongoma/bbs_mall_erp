import { createContext, useContext } from 'react'
import type { DocField, DocRecord } from '../types/meta'

type AnyRecord = Record<string, any>

export interface FieldLayoutDocument {
  fieldPropertyOverrides?: Record<string, Partial<DocField>>
  fieldHtmlMap?: Record<string, string>
}

export interface FieldLayoutGridUi {
  hiddenColumns?: Set<string>
  cannotAddRows?: boolean
  cannotDeleteRows?: boolean
  sortable?: boolean
  multipleAdd?: () => void
  download?: () => void
  upload?: () => void
  customButtons?: Array<{ label: string; action: () => unknown; position?: string }>
}

export interface FieldLayoutGridOps {
  addRow: () => void
  deleteRows: (names: Set<string>) => void
  duplicateRows: (names: Set<string>) => void
  reorder: (rows: AnyRecord[]) => void
}

export interface FieldLinkQuery {
  query?: string
  filters?: unknown
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
  resolveLinkQuery?: (fieldname: string, row?: AnyRecord | null) => FieldLinkQuery | undefined
  registerHtmlHost?: (fieldname: string, element: HTMLElement | null, row?: AnyRecord | null) => void
  gridUi?: (tableFieldname: string) => FieldLayoutGridUi | undefined
  gridOps?: (tableFieldname: string) => FieldLayoutGridOps | undefined
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
