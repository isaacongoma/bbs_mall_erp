import type { ReactNode } from 'react'
import type { To } from 'react-router-dom'

export type ListAlign = 'left' | 'start' | 'center' | 'middle' | 'right' | 'end'

export interface ListColumn {
  key: string
  label?: string
  width?: number | string
  align?: ListAlign
  prefix?: ReactNode | ((context: { row: ListRowData }) => ReactNode)
  getLabel?: (context: { row: ListRowData }) => string
  getTooltip?: (row: ListRowData) => string
  [key: string]: unknown
}

export interface ListRowData {
  disabled?: boolean
  group?: string
  rows?: ListRowData[]
  collapsed?: boolean
  [key: string]: any
}

export interface ListEmptyStateOptions {
  title?: string
  description?: string
  button?: Record<string, unknown>
}

export interface ListOptions {
  getRowRoute?: ((row: ListRowData) => To | string | null | undefined) | null
  onRowClick?: ((row: ListRowData, event: React.MouseEvent) => void) | null
  showTooltip?: boolean
  selectionText?: (count: number) => string
  enableActive?: boolean
  selectable?: boolean
  resizeColumn?: boolean
  rowHeight?: number | string
  emptyState?: ListEmptyStateOptions
}

export interface ResolvedListOptions {
  getRowRoute: ((row: ListRowData) => To | string | null | undefined) | null
  onRowClick: ((row: ListRowData, event: React.MouseEvent) => void) | null
  showTooltip: boolean
  selectionText: (count: number) => string
  enableActive: boolean
  selectable: boolean
  resizeColumn: boolean
  rowHeight: number | string
  emptyState?: ListEmptyStateOptions
}

export interface ListCellContext {
  column: ListColumn
  row: ListRowData
  item: unknown
  align?: ListAlign
}

export interface ListRowRenderContext {
  idx: number
  column: ListColumn
  item: unknown
  isActive: boolean
}

export interface ListGroupData extends ListRowData {
  group: string
  rows: ListRowData[]
}

export interface ListViewRenderers {
  cell?: (context: ListCellContext) => ReactNode
  groupHeader?: (context: { group: ListGroupData }) => ReactNode
  groupEmpty?: (context: { group: ListGroupData }) => ReactNode
}

export interface ListViewContextValue {
  rowKey: string
  rows: ListRowData[]
  columns: ListColumn[]
  options: ResolvedListOptions
  selections: Set<string | number>
  activeRow: string | number | null
  allRowsSelected: boolean
  renderers: ListViewRenderers
  setActiveRow: (value: string | number | null) => void
  setSelections: (next: Set<string | number>) => void
  toggleRow: (key: string | number, disabled?: boolean) => void
  toggleAllRows: (select?: boolean) => void
  isGroupCollapsed: (group: ListGroupData) => boolean
  toggleGroup: (group: ListGroupData) => void
}
