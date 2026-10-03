import type { Resource } from '@/core/resources'

export type ViewListResource = Resource<any, any>

export interface ListViewColumn {
  key: string
  label: string
  type?: string
  width?: string | number
  align?: string
  options?: Record<string, unknown>
  [key: string]: unknown
}

export interface ListViewParams {
  doctype: string
  filters: Record<string, unknown>
  order_by: string
  default_filters?: Record<string, unknown>
  view: { custom_view_name: string; view_type: string; group_by_field: string }
  column_field: string
  title_field: string
  kanban_columns: unknown
  kanban_fields: unknown
  columns: unknown
  rows: unknown
  page_length: number
  page_length_count: number
}

export interface ViewDefinition {
  name: string
  label: string
  type: string
  icon: string
  filters: Record<string, unknown>
  order_by: string
  group_by_field?: string
  column_field: string
  title_field: string
  kanban_columns: unknown
  kanban_fields: unknown
  columns: unknown
  rows: unknown
  route_name?: string
  load_default_columns: boolean
  pinned: boolean
  public: boolean
  doctype?: string
  mode?: 'create' | 'edit' | 'duplicate'
  [key: string]: unknown
}
