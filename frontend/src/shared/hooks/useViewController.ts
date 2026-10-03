import { createElement, useEffect, useEffectEvent, useRef, useState, type ComponentType, type MouseEvent } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router, useRoute } from '@/core/navigation'
import { useResource } from '@/core/resources'
import { createDialog, toast, usePageMeta, type DropdownGroupOption, type DropdownOption } from '@/design-system'
import type { QuickFilter } from '../components/QuickFilterField'
import {
  DuplicateIcon,
  CheckIcon,
  EditIcon,
  GroupByIcon,
  KanbanIcon,
  ListIcon,
  PinIcon,
  UnpinIcon,
} from '../components/Icons'
import { Icon } from '../components/Icon'
import type { CrmView } from '../stores/viewsStore'
import type { ListViewColumn, ListViewParams, ViewDefinition } from '../types/view'
import { isEmoji } from '../utils/emoji'
import {
  DEFAULT_PAGE_LENGTH,
  buildExportUrl,
  createViewControllerState,
  buildQuickFilterList,
  buildViewParams,
  dirtySignature,
  getViewTypeLabel,
  resolveMePlaceholders,
} from '../utils/viewController'
import { useUsers } from './useUsers'
import { useViews } from './useViews'

type AnyRecord = Record<string, any>

export interface ViewControllerOptions {
  hideColumnsButton?: boolean
  defaultViewName?: string
  allowedViews?: string[]
}

export interface UseViewControllerInput {
  doctype: string
  filters?: AnyRecord
  options?: ViewControllerOptions
  brandFavicon?: string
  isKanbanLostStatus?: (status: string) => boolean
}

export interface ColumnsUpdate {
  columns: ListViewColumn[]
  rows: string[]
  isDefault: boolean
  reload?: boolean
  reset?: boolean
}

export interface KanbanMoveData {
  item?: string
  to?: string
  from?: string
  fromIndex?: number
  kanban_columns?: unknown
  fetchNewColumns?: boolean
  kanban_fields?: string[]
  column_field?: string
  title_field?: string
}

export interface ApplyFilterEvent {
  event: MouseEvent
  idx: number
  column: ListViewColumn
  item: any
  firstColumn: ListViewColumn
}

const VIEW_SETTINGS = 'crm.fcrm.doctype.crm_view_settings.crm_view_settings'

function viewTypeIcon(type: string): ComponentType<{ className?: string }> {
  if (type === 'group_by') return GroupByIcon
  if (type === 'kanban') return KanbanIcon
  return ListIcon
}

function getViewIcon(icon: unknown, type: string): DropdownOption['icon'] {
  if (typeof icon === 'string' && isEmoji(icon)) return () => createElement('div', null, icon)
  if (!icon && type === 'group_by') return GroupByIcon
  if (!icon && type === 'kanban') return KanbanIcon
  if (icon && typeof icon === 'string') return () => createElement(Icon, { icon, className: 'h-4 w-4' })
  return (icon as DropdownOption['icon']) || ListIcon
}

export function useViewController({
  doctype,
  filters = {},
  options = {},
  brandFavicon,
  isKanbanLostStatus,
}: UseViewControllerInput) {
  const route = useRoute()
  const { getView, getDefaultView, reload: reloadViews } = useViews()
  const { isManager, getUser } = useUsers()
  const viewQuery = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view
  const viewType = route.params.viewType
  const routeName = route.name

  const [store] = useState(createViewControllerState)

  const [viewUpdated, setViewUpdated] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewModalObj, setViewModalObj] = useState<ViewDefinition>({} as ViewDefinition)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [pendingKanbanMove, setPendingKanbanMove] = useState<KanbanMoveData | null>(null)
  const [showKanbanLostReasonModal, setShowKanbanLostReasonModal] = useState(false)

  const viewRecord = getView(viewQuery, viewType, doctype)

  function build(data?: AnyRecord | null) {
    return buildViewParams({
      doctype,
      defaultFilters: filters,
      view: viewRecord,
      viewType,
      routeName,
      pageLength: data?.page_length ?? DEFAULT_PAGE_LENGTH,
      pageLengthCount: data?.page_length_count ?? DEFAULT_PAGE_LENGTH,
    })
  }

  function getViewDraft(): ViewDefinition {
    const existing = store.getView()
    if (existing) return existing
    const created = build().viewDraft
    store.setView(created)
    return created
  }

  function getParams(data?: AnyRecord | null): ListViewParams {
    const built = build(data)
    store.setView(built.viewDraft)
    return built.params
  }

  const list = useResource<AnyRecord>({
    url: 'crm.api.doc.get_data',
    params: build().params,
    cache: [doctype, viewQuery, viewType],
    auto: true,
    onSuccess(data: AnyRecord) {
      const current = getView(viewQuery, viewType, doctype)
      const params: ListViewParams = list.params || getParams(data)
      list.update({ params })
      store.setDefaultParams({
        doctype,
        filters: params.filters,
        order_by: params.order_by,
        default_filters: filters,
        view: {
          custom_view_name: current?.name || '',
          view_type: current?.type || viewType || 'list',
          group_by_field: params?.view?.group_by_field || 'owner',
        },
        column_field: data.column_field,
        title_field: data.title_field,
        kanban_columns: data.kanban_columns,
        kanban_fields: data.kanban_fields,
        columns: data.columns,
        rows: data.rows,
        page_length: params.page_length,
        page_length_count: params.page_length_count,
      })
    },
  })

  const [initialized, setInitialized] = useState(false)
  if (!initialized) {
    setInitialized(true)
    if (dirtySignature(list.params) !== dirtySignature(build().params)) setViewUpdated(true)
  }

  const isLoading = Boolean(list.loading)

  const quickFiltersResource = useResource<QuickFilter[]>({
    url: 'crm.api.doc.get_quick_filters',
    params: { doctype },
    cache: ['Quick Filters', doctype],
    auto: true,
  })

  function getListParams(): ListViewParams {
    if (!list.params) list.update({ params: getParams(list.data) })
    return list.params
  }

  const quickFilterList = buildQuickFilterList(quickFiltersResource.data, list.params?.filters)

  function viewTypeInfo() {
    const type = viewType || 'list'
    return { name: type, label: getViewTypeLabel(type), icon: viewTypeIcon(type) }
  }

  const currentView = {
    name: viewRecord?.name || viewTypeInfo().name,
    label: viewRecord?.label || options.defaultViewName || viewTypeInfo().label,
    icon: viewRecord?.icon || viewTypeInfo().icon,
    is_standard: !viewRecord || Boolean(viewRecord.is_standard),
  }

  usePageMeta({
    title: currentView.is_standard ? `${routeName} - ${currentView.label}` : currentView.label,
    emoji: typeof currentView.icon === 'string' && isEmoji(currentView.icon) ? currentView.icon : '',
    icon: brandFavicon,
  })

  function reload() {
    if (list.loading) return
    list.update({ params: getParams(list.data) })
    void list.reload().catch(() => undefined)
  }

  const mounted = useRef(false)
  const viewSignature = JSON.stringify(viewRecord)
  const onViewRecordChanged = useEffectEvent(() => {
    if (store.takePendingReload()) return
    reload()
  })

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onViewRecordChanged()
  }, [viewSignature])

  function ensureDefaultParams(): ListViewParams {
    const existing = store.getDefaultParams()
    if (existing) return existing
    const created = getParams(list.data)
    store.setDefaultParams(created)
    return created
  }

  function applyParams(patch: Partial<ListViewParams>, viewPatch: Partial<ViewDefinition>): ListViewParams {
    const params = { ...ensureDefaultParams(), ...patch }
    store.setDefaultParams(params)
    store.setView({ ...getViewDraft(), ...viewPatch })
    list.update({ params })
    return params
  }

  function afterParamsChanged() {
    setViewUpdated(true)
    if (!viewQuery) createOrUpdateStandardView()
  }

  function updateFilter(next: AnyRecord) {
    setViewUpdated(true)
    applyParams({ filters: next }, { filters: next })
    void list.reload().catch(() => undefined)
    if (!viewQuery) createOrUpdateStandardView()
  }

  function updateSort(orderBy: string) {
    applyParams({ order_by: orderBy }, { order_by: orderBy })
    void list.reload().catch(() => undefined)
    afterParamsChanged()
  }

  function updateGroupBy(groupByField: string) {
    const base = ensureDefaultParams()
    applyParams({ view: { ...base.view, group_by_field: groupByField } }, { group_by_field: groupByField })
    void list.reload().catch(() => undefined)
    afterParamsChanged()
  }

  function updateColumns(update?: ColumnsUpdate) {
    const source: ColumnsUpdate = update ?? {
      columns: list.data?.columns,
      rows: list.data?.rows,
      isDefault: false,
    }
    const base = ensureDefaultParams()
    const columns = source.isDefault ? '' : source.columns
    const rows = source.isDefault ? '' : source.rows
    let params: ListViewParams = { ...base, columns, rows }
    store.setView({
      ...getViewDraft(),
      columns,
      rows,
      load_default_columns: source.isDefault,
    })
    if (source.reset) {
      const rebuilt = getParams(list.data)
      params = { ...params, columns: rebuilt.columns, rows: rebuilt.rows }
    }
    store.setDefaultParams(params)
    if (source.reload) {
      list.update({ params })
      void list.reload().catch(() => undefined)
    }
    setViewUpdated(true)

    if (!viewQuery) createOrUpdateStandardView()
    else if (!getViewDraft().public) persistCustomView()
  }

  async function persistCustomView() {
    const draft = { ...getViewDraft(), doctype }
    store.setView(draft)
    await rpc({ url: `${VIEW_SETTINGS}.update`, params: { view: draft } })
    await reloadViews()
    setViewUpdated(false)
  }

  async function createOrUpdateStandardView() {
    if (viewQuery) return
    const draft = { ...getViewDraft(), doctype }
    await rpc({ url: `${VIEW_SETTINGS}.create_or_update_standard_view`, params: { view: draft } })
    store.addPendingReload()
    reloadViews().catch(() => {
      store.dropPendingReload()
    })
    const params = store.getDefaultParams()
    store.setView({
      label: draft.label,
      type: draft.type || 'list',
      icon: draft.icon,
      name: draft.name,
      filters: params?.filters ?? {},
      order_by: params?.order_by ?? 'modified desc',
      group_by_field: params?.view?.group_by_field,
      column_field: params?.column_field ?? 'status',
      title_field: params?.title_field ?? '',
      kanban_columns: params?.kanban_columns,
      kanban_fields: params?.kanban_fields,
      columns: params?.columns,
      rows: params?.rows,
      route_name: routeName ?? undefined,
      load_default_columns: draft.load_default_columns,
      pinned: false,
      public: false,
    })
    setViewUpdated(false)
  }

  function updatePageLength(value: number | boolean, loadMore = false) {
    if (list.loading) return
    const base = ensureDefaultParams()
    let params = { ...base }
    if (loadMore) {
      params.page_length = base.page_length + base.page_length_count
    } else {
      const length = Number(value)
      if (length === base.page_length && length === base.page_length_count) return
      params = { ...params, page_length: length, page_length_count: length }
    }
    store.setDefaultParams(params)
    list.update({ params })
    void list.reload().catch(() => undefined)
  }

  function loadMore() {
    updatePageLength(true, true)
  }

  function getKanbanStatusIsLost(status: string): boolean {
    return Boolean(isKanbanLostStatus?.(status))
  }

  function revertKanbanCardMove(data: KanbanMoveData | null) {
    if (!data?.from) return
    list.setData((current: AnyRecord | null) => {
      const columns: AnyRecord[] | undefined = current?.data
      if (!columns) return current
      const next = structuredClone(columns)
      const toColumn = next.find((column) => column.column.name === data.to)
      const fromColumn = next.find((column) => column.column.name === data.from)
      if (!toColumn || !fromColumn) return current
      const index = toColumn.data.findIndex((row: AnyRecord) => row.name === data.item)
      if (index === -1) return current
      const [row] = toColumn.data.splice(index, 1)
      const restoreAt = Math.min(data.fromIndex ?? 0, fromColumn.data.length)
      fromColumn.data.splice(restoreAt, 0, row)
      return { ...current, data: next }
    })
  }

  function persistKanbanColumnOrder(kanbanColumns: unknown) {
    if (!kanbanColumns) return
    setViewUpdated(true)
    applyParams({ kanban_columns: kanbanColumns }, { kanban_columns: kanbanColumns })
    if (!viewQuery) createOrUpdateStandardView()
  }

  function moveKanbanCard(data: KanbanMoveData, fields: AnyRecord) {
    rpc({ url: 'frappe.client.set_value', params: { doctype, name: data.item, fieldname: fields } })
      .then(() => persistKanbanColumnOrder(data.kanban_columns))
      .catch(() => {
        toast.error(__('Could not move the card. Reverting.'))
        revertKanbanCardMove(data)
      })
  }

  function confirmKanbanLostReason(payload: AnyRecord) {
    const data = pendingKanbanMove
    setPendingKanbanMove(null)
    if (!data) return
    moveKanbanCard(data, { [getViewDraft().column_field as string]: data.to, ...payload })
  }

  function cancelKanbanLostReason() {
    const data = pendingKanbanMove
    setPendingKanbanMove(null)
    toast.info(__('Move cancelled: a lost reason is required for this status.'))
    revertKanbanCardMove(data)
  }

  function fetchAndUpdateKanbanColumns(view: { name?: string }) {
    rpc<unknown>({ url: `${VIEW_SETTINGS}.fetch_and_update_kanban_columns`, params: { name: view.name } }).then(
      (columns) => {
        applyParams({ kanban_columns: columns }, { kanban_columns: columns })
        void list.reload().catch(() => undefined)
      },
    )
  }

  function updateKanbanSettings(data: KanbanMoveData) {
    if (data.item && data.to) {
      if (getViewDraft().column_field === 'status' && getKanbanStatusIsLost(data.to)) {
        setPendingKanbanMove(data)
        setShowKanbanLostReasonModal(true)
        return
      }
      moveKanbanCard(data, { [getViewDraft().column_field as string]: data.to })
      return
    }

    if (data.fetchNewColumns) {
      fetchAndUpdateKanbanColumns(getViewDraft())
      return
    }

    setViewUpdated(true)
    const patch: Partial<ListViewParams> = {}
    const viewPatch: Partial<ViewDefinition> = {}
    if (data.kanban_columns) {
      patch.kanban_columns = data.kanban_columns
      viewPatch.kanban_columns = data.kanban_columns
    }
    if (data.kanban_fields) {
      patch.kanban_fields = data.kanban_fields
      viewPatch.kanban_fields = data.kanban_fields
    }
    if (data.column_field && data.column_field !== getViewDraft().column_field) {
      patch.column_field = data.column_field
      patch.kanban_columns = ''
      viewPatch.column_field = data.column_field
      viewPatch.kanban_columns = ''
    }
    if (data.title_field && data.title_field !== getViewDraft().title_field) {
      patch.title_field = data.title_field
      viewPatch.title_field = data.title_field
    }
    applyParams(patch, viewPatch)
    void list.reload().catch(() => undefined)
    if (!viewQuery) createOrUpdateStandardView()
  }

  function loadMoreKanban(columnName: string) {
    let columns = list.data?.kanban_columns || '[]'
    if (typeof columns === 'string') columns = JSON.parse(columns)
    columns = structuredClone(columns)
    const column = columns.find((entry: AnyRecord) => entry.name === columnName)
    if (!column) return
    column.page_length = column.page_length ? column.page_length + 20 : 40
    applyParams({ kanban_columns: columns }, { kanban_columns: columns })
    void list.reload().catch(() => undefined)
  }

  function cancelChanges() {
    reload()
    setViewUpdated(false)
  }

  function saveView() {
    const params = store.getDefaultParams()
    const draft = getViewDraft()
    const next: ViewDefinition = {
      label: draft.label,
      type: draft.type || 'list',
      icon: draft.icon,
      name: draft.name,
      filters: params?.filters ?? {},
      order_by: params?.order_by ?? 'modified desc',
      group_by_field: params?.view?.group_by_field,
      column_field: params?.column_field ?? 'status',
      title_field: params?.title_field ?? '',
      kanban_columns: params?.kanban_columns,
      kanban_fields: params?.kanban_fields,
      columns: params?.columns,
      rows: params?.rows,
      route_name: routeName ?? undefined,
      load_default_columns: draft.load_default_columns,
      pinned: draft.pinned,
      public: draft.public,
      mode: 'edit',
    }
    store.setView(next)
    setViewModalObj(next)
    setShowViewModal(true)
  }

  function createView() {
    const draft = {
      ...(store.getView() ?? build().viewDraft),
      name: '',
      label: '',
      icon: '',
      mode: 'create' as const,
    }
    store.setView(draft)
    setViewModalObj(draft)
    setShowViewModal(true)
  }

  function isDefaultView(view: { name?: string }): boolean {
    const defaultView = getDefaultView(routeName)
    if (!defaultView || !view.name) return false
    return defaultView.name === view.name
  }

  async function setAsDefault(view: CrmView) {
    await rpc({
      url: `${VIEW_SETTINGS}.set_as_default`,
      params: { name: view.name, type: view.type, doctype: view.dt },
    })
    await reloadViews()
    void list.reload().catch(() => undefined)
  }

  function openViewModal(view: AnyRecord, mode: 'duplicate' | 'edit', close?: () => void) {
    const next = {
      ...view,
      label: mode === 'duplicate' ? `${view.label}${__(' (New)')}` : view.label,
      mode,
    } as ViewDefinition
    setViewModalObj(next)
    setShowViewModal(true)
    close?.()
  }

  async function publicView(view: CrmView) {
    await rpc({ url: `${VIEW_SETTINGS}.public`, params: { name: view.name, value: !view.public } })
    await reloadViews()
    void list.reload().catch(() => undefined)
  }

  async function pinView(view: CrmView) {
    await rpc({ url: `${VIEW_SETTINGS}.pin`, params: { name: view.name, value: !view.pinned } })
    await reloadViews()
    void list.reload().catch(() => undefined)
  }

  async function deleteView(view: CrmView, close: () => void) {
    close()
    await rpc({ url: `${VIEW_SETTINGS}.delete`, params: { name: view.name } })
    router.push({ name: routeName ?? undefined, params: { viewType: 'list' } })
    await reloadViews()
    void list.reload().catch(() => undefined)
  }

  function viewActions(view: { name: string | number; label?: string }, close: () => void): DropdownGroupOption[] {
    const isStandard = typeof view.name === 'string' && ['list', 'kanban', 'group_by'].includes(view.name)
    let record: AnyRecord | null = isStandard ? getView(null, String(view.name), doctype) : getView(String(view.name))
    if (!record) record = { label: view.label, type: view.name, dt: doctype }

    const items: DropdownOption[] = [
      {
        label: __('Duplicate'),
        icon: DuplicateIcon,
        onClick: () => openViewModal(record!, 'duplicate', close),
      },
    ]

    if (isStandard && !isDefaultView(record)) {
      items.unshift({
        label: __('Set As Default'),
        icon: CheckIcon,
        onClick: () => void setAsDefault(record as CrmView),
      })
    }

    const groups: DropdownGroupOption[] = [{ group: __('Actions'), hideLabel: true, items }]

    if (!isStandard && (!record.public || isManager())) {
      items.push({
        label: __('Edit'),
        icon: EditIcon,
        onClick: () => openViewModal(record!, 'edit', close),
      })

      if (!record.public) {
        items.push({
          label: record.pinned ? __('Unpin View') : __('Pin View'),
          icon: record.pinned ? UnpinIcon : PinIcon,
          onClick: () => void pinView(record as CrmView),
        })
      }

      if (isManager()) {
        items.push({
          label: record.public ? __('Make Private') : __('Make Public'),
          icon: record.public ? 'lucide-lock' : 'lucide-unlock',
          onClick: () => void publicView(record as CrmView),
        })
      }

      groups.push({
        group: __('Delete View'),
        hideLabel: true,
        items: [
          {
            label: __('Delete'),
            icon: 'lucide-trash-2',
            onClick: () =>
              createDialog({
                title: __('Delete View'),
                message: __('Are you sure you want to delete "{0}" view?', [record!.label]),
                actions: [
                  {
                    label: __('Delete'),
                    variant: 'solid',
                    theme: 'red',
                    onClick: ({ close: closeDialog }) => void deleteView(record as CrmView, closeDialog),
                  },
                ],
              }),
          },
        ],
      })
    }
    return groups
  }

  const allowedViews = options.allowedViews || ['list']
  const standardViewDefinitions = (['list', 'kanban', 'group_by'] as const)
    .filter((type) => allowedViews.includes(type))
    .map((type) => ({
      name: type,
      label: __(options.defaultViewName) || getViewTypeLabel(type),
      icon: viewTypeIcon(type),
      onClick() {
        setViewUpdated(false)
        router.push({ name: routeName ?? undefined, params: { viewType: type } })
      },
    }))

  const viewsDropdownOptions: DropdownGroupOption[] = (() => {
    const groups: DropdownGroupOption[] = [
      {
        group: __('Standard Views'),
        hideLabel: true,
        items: standardViewDefinitions.map((item) => ({ ...item, selected: item.name === currentView.name })),
      },
    ]

    const views: AnyRecord[] | undefined = list.data?.views
    if (views) {
      const prepared: AnyRecord[] = views.map((source) => {
        const type = source.type || 'list'
        return {
          ...source,
          label: __(source.label),
          type,
          icon: getViewIcon(source.icon, type),
          selected: source.name === currentView.name,
          filters: typeof source.filters === 'string' ? JSON.parse(source.filters) : source.filters,
          onClick: () => {
            setViewUpdated(false)
            router.push({ name: routeName ?? undefined, params: { viewType: type }, query: { view: source.name } })
          },
        }
      })
      const publicViews = prepared.filter((view) => view.public)
      const savedViews = prepared.filter((view) => !view.pinned && !view.public && !view.is_standard)
      const pinnedViews = prepared.filter((view) => view.pinned)

      if (savedViews.length) groups.push({ group: __('Saved Views'), items: savedViews as DropdownOption[] })
      if (publicViews.length) groups.push({ group: __('Public Views'), items: publicViews as DropdownOption[] })
      if (pinnedViews.length) groups.push({ group: __('Pinned Views'), items: pinnedViews as DropdownOption[] })
    }

    groups.push({
      group: __('Actions'),
      hideLabel: true,
      items: [{ label: __('Create View'), icon: 'lucide-plus', onClick: createView }],
    })
    return groups
  })()

  function applyQuickFilter(filter: QuickFilter, value: unknown) {
    const next = { ...getListParams().filters } as AnyRecord
    const field = filter.fieldname
    if (value) {
      if (['Check', 'Select', 'Link', 'Date', 'Datetime'].includes(filter.fieldtype)) next[field] = value
      else next[field] = ['LIKE', `%${value}%`]
    } else {
      delete next[field]
    }
    updateFilter(next)
  }

  function applyFilter({ event, idx, column, item, firstColumn }: ApplyFilterEvent) {
    const restrictedFieldtypes = ['Datetime', 'Time']
    if (restrictedFieldtypes.includes(column.type ?? '') || idx === 0) return
    if (idx === 1 && firstColumn.key === '_liked_by') return

    event.stopPropagation()
    event.preventDefault()

    const next = { ...getListParams().filters } as AnyRecord
    const value = item?.name ?? item?.label ?? item

    if (value !== null && value !== undefined && value !== '') next[column.key] = value
    else delete next[column.key]

    if (column.key === '_assign') {
      if (item.length > 1) {
        const target = (event.target as HTMLElement).closest('.user-avatar')
        if (target) next._assign = ['LIKE', `%${target.getAttribute('data-name')}%`]
      } else {
        next._assign = ['LIKE', `%${item[0].name}%`]
      }
    }
    updateFilter(next)
  }

  function applyLikeFilter() {
    const next = { ...getListParams().filters } as AnyRecord
    if (!next._liked_by) next._liked_by = ['LIKE', '%@me%']
    else delete next._liked_by
    updateFilter(next)
  }

  async function likeDoc({ name, liked }: { name: string; liked: boolean }) {
    await rpc({ url: 'frappe.desk.like.toggle_like', params: { doctype, name, add: liked ? 'No' : 'Yes' } })
    reload()
  }

  function exportRows(fileFormat: string, exportAll: boolean) {
    const columns: ListViewColumn[] = list.data?.columns ?? []
    const merged = resolveMePlaceholders({ ...filters, ...(list.params?.filters ?? {}) }, getUser()?.name)
    window.location.href = buildExportUrl({
      doctype,
      fileFormat,
      fields: columns.map((column) => column.key),
      filters: merged,
      orderBy: list.params?.order_by,
      pageLength: exportAll ? list.data?.total_count : list.params?.page_length,
      selectedItems: exportAll ? undefined : selectedRows,
    })
  }

  async function saveQuickFilters(newQuickFilters: QuickFilter[]) {
    const newNames = newQuickFilters.map((filter) => filter.fieldname)
    const oldNames = (quickFiltersResource.data ?? []).map((filter) => filter.fieldname)
    await rpc({
      url: 'crm.api.doc.update_quick_filters',
      params: {
        quick_filters: JSON.stringify(newNames),
        old_filters: JSON.stringify(oldNames),
        doctype,
      },
    })
    quickFiltersResource.update({ params: { doctype, cached: false } })
    await quickFiltersResource.reload()
    toast.success(__('Quick filters updated successfully'))
  }

  return {
    doctype,
    options,
    filters,
    list,
    isLoading,
    viewUpdated,
    viewRecord,
    currentView,
    viewsDropdownOptions,
    viewActions,
    quickFilters: quickFiltersResource,
    quickFilterList,
    saveQuickFilters,
    showViewModal,
    setShowViewModal,
    viewModalObj,
    setViewModalObj,
    afterViewCreate: async (view: ViewDefinition) => {
      await reloadViews()
      setViewUpdated(false)
      router.push({
        name: routeName ?? undefined,
        params: { viewType: view.type || 'list' },
        query: { view: view.name },
      })
    },
    afterViewUpdate: async () => {
      setViewUpdated(false)
      await reloadViews()
      void list.reload().catch(() => undefined)
    },
    selectedRows,
    updateSelections: (selections: Iterable<string>) => setSelectedRows(Array.from(selections)),
    showKanbanLostReasonModal,
    setShowKanbanLostReasonModal,
    confirmKanbanLostReason,
    cancelKanbanLostReason,
    reload,
    cancelChanges,
    saveView,
    updateFilter,
    updateSort,
    updateGroupBy,
    updateColumns,
    updateKanbanSettings,
    fetchAndUpdateKanbanColumns,
    loadMoreKanban,
    loadMore,
    updatePageLength,
    applyQuickFilter,
    applyFilter,
    applyLikeFilter,
    likeDoc,
    exportRows,
  }
}

export type ViewController = ReturnType<typeof useViewController>
