import { __ } from '@/core/i18n'
import type { QuickFilter } from '../components/QuickFilterField'
import type { CrmView } from '../stores/viewsStore'
import type { ListViewParams, ViewDefinition } from '../types/view'

export const DEFAULT_PAGE_LENGTH = 20

export type StandardViewType = 'list' | 'group_by' | 'kanban'

export function getViewTypeLabel(viewType: string): string {
  switch (viewType) {
    case 'group_by':
      return __('Group By')
    case 'kanban':
      return __('Kanban')
    default:
      return __('List')
  }
}

export interface BuildParamsInput {
  doctype: string
  defaultFilters: Record<string, unknown>
  view: CrmView | null
  viewType: string | undefined
  routeName: string | null
  pageLength: number
  pageLengthCount: number
}

export interface BuiltParams {
  params: ListViewParams
  viewDraft: ViewDefinition
}

export function buildViewParams(input: BuildParamsInput): BuiltParams {
  const { doctype, defaultFilters, view, viewType, routeName, pageLength, pageLengthCount } = input
  const viewName = view?.name || ''
  const resolvedType = view?.type || viewType || 'list'
  const filters = (view?.filters && (typeof view.filters === 'string' ? JSON.parse(view.filters) : view.filters)) || {}
  const orderBy = view?.order_by || 'modified desc'
  const groupByField = view?.group_by_field || 'owner'
  const columns = view?.columns || ''
  const rows = view?.rows || ''
  const columnField = view?.column_field || 'status'
  const titleField = view?.title_field || ''
  const kanbanColumns = view?.kanban_columns || ''
  const kanbanFields = view?.kanban_fields || ''

  const viewDraft: ViewDefinition = {
    name: viewName,
    label: view?.label || getViewTypeLabel(viewType || 'list'),
    type: resolvedType,
    icon: view?.icon || '',
    filters,
    order_by: orderBy,
    group_by_field: groupByField,
    column_field: columnField,
    title_field: titleField,
    kanban_columns: kanbanColumns,
    kanban_fields: kanbanFields,
    columns,
    rows,
    route_name: view?.route_name || routeName || undefined,
    load_default_columns: view?.row || true,
    pinned: view?.pinned || false,
    public: view?.public || false,
  } as ViewDefinition

  const params: ListViewParams = {
    doctype,
    filters,
    order_by: orderBy,
    default_filters: defaultFilters,
    view: { custom_view_name: viewName, view_type: resolvedType, group_by_field: groupByField },
    column_field: columnField,
    title_field: titleField,
    kanban_columns: kanbanColumns,
    kanban_fields: kanbanFields,
    columns,
    rows,
    page_length: pageLength,
    page_length_count: pageLengthCount,
  }

  return { params, viewDraft }
}

export function dirtySignature(params: Partial<ListViewParams> | null | undefined): string {
  const source = params ?? {}
  return JSON.stringify([
    source.filters || {},
    source.order_by,
    source.view?.group_by_field,
    source.column_field,
    source.title_field,
    source.kanban_fields,
  ])
}

export function buildQuickFilterList(
  quickFilters: QuickFilter[] | null | undefined,
  filters: Record<string, any> | undefined,
): QuickFilter[] {
  return (quickFilters ?? []).map((source) => {
    const filter: QuickFilter = { ...source, value: source.fieldtype === 'Check' ? false : '' }
    const stored = filters?.[filter.fieldname]
    if (!stored) return filter

    if (Array.isArray(stored)) {
      const operator = String(stored[0] ?? '').toLowerCase()
      const exact = ['Check', 'Select', 'Link', 'Date', 'Datetime'].includes(filter.fieldtype)
      if ((exact && operator === 'like') || operator !== 'like') return filter
      filter.value = String(stored[1] ?? '').replace(/%/g, '')
    } else if (typeof stored === 'boolean') {
      filter.value = stored
    } else {
      filter.value = String(stored).replace(/%/g, '')
    }
    return filter
  })
}

export function resolveMePlaceholders(filters: Record<string, any>, userId: string | undefined): Record<string, any> {
  if (!userId) return filters
  const resolved = { ...filters }
  Object.keys(resolved).forEach((key) => {
    const value = resolved[key]
    if (value === '@me') {
      resolved[key] = userId
      return
    }
    if (!Array.isArray(value)) return
    resolved[key] = value.map((entry) => (entry === '@me' ? userId : entry === '%@me%' ? `%${userId}%` : entry))
  })
  return resolved
}

export interface ExportQuery {
  doctype: string
  fileFormat: string
  fields: string[]
  filters: Record<string, unknown>
  orderBy: string
  pageLength: number
  selectedItems?: string[]
}

export function buildExportUrl(query: ExportQuery): string {
  const params = new URLSearchParams({
    file_format_type: query.fileFormat,
    title: query.doctype,
    doctype: query.doctype,
    fields: JSON.stringify(query.fields),
    filters: JSON.stringify(query.filters),
    order_by: query.orderBy,
    page_length: String(query.pageLength),
    start: '0',
    view: 'Report',
    with_comment_count: '1',
  })
  if (query.selectedItems?.length) params.set('selected_items', JSON.stringify(query.selectedItems))
  return `/api/crm/doc/export/?${params.toString()}`
}

export function createViewControllerState() {
  let defaultParams: ListViewParams | null = null
  let view: ViewDefinition | null = null
  let pending = 0

  return {
    getDefaultParams: () => defaultParams,
    setDefaultParams(next: ListViewParams | null) {
      defaultParams = next
    },
    getView: () => view,
    setView(next: ViewDefinition | null) {
      view = next
    },
    addPendingReload() {
      pending += 1
    },
    dropPendingReload() {
      pending = Math.max(0, pending - 1)
    },
    takePendingReload(): boolean {
      if (pending <= 0) return false
      pending -= 1
      return true
    },
  }
}
