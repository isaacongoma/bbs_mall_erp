import type { ComponentType, ReactNode } from 'react'
import { __ } from '@/core/i18n'
import { useRoute } from '@/core/navigation'
import { Button } from '@/design-system'
import { useListBulkActions, type BulkActionContext, type BulkActionOptions } from '../hooks/useListBulkActions'
import { useViewController, type ViewControllerOptions } from '../hooks/useViewController'
import { alignLastColumn, buildListRows, type BuildRowsOptions } from '../utils/listRows'
import { useMeta } from '../hooks/useMeta'
import { CustomActions } from './CustomActions'
import { LayoutHeader } from './LayoutHeader'
import { DocListView, EmptyState, type DocListConfig } from './ListViews'
import { ViewBreadcrumbs } from './ViewBreadcrumbs'
import { ViewControls, type LostReasonModalSlotProps } from './ViewControls'
import type { ViewController } from '../hooks/useViewController'
import type { ListRowData } from '@/design-system'
import type { ViewListResource } from '../types/view'

type AnyRecord = Record<string, any>

export interface DocListPageProps {
  routeName: string
  doctype: string
  emptyName: string
  emptyIcon: ComponentType<{ className?: string }>
  config: DocListConfig | ((controller: ViewController) => DocListConfig)
  rows: Omit<BuildRowsOptions, 'formatters'>
  filters?: AnyRecord
  controllerOptions?: ViewControllerOptions
  brandFavicon?: string
  onCreate: (controller: ViewController) => void
  bulkOptions?: BulkActionOptions
  extraBulkActions?: (list: ViewListResource) => (context: BulkActionContext) => any[]
  isLostStatus?: (doctype: string, status: string) => boolean
  isKanbanLostStatus?: (status: string) => boolean
  viewLinkedDoc?: (row: Record<string, any>) => void
  lostReasonModal?: ComponentType<LostReasonModalSlotProps>
  kanbanRequiresRows?: boolean
  renderKanban?: (context: { controller: ViewController; rows: ListRowData[] }) => ReactNode
  renderExtras?: (context: { controller: ViewController; rows: ListRowData[] }) => ReactNode
  modals?: ReactNode
  children?: ReactNode
}

export function DocListPage({
  routeName,
  doctype,
  emptyName,
  emptyIcon,
  config,
  rows: rowOptions,
  filters,
  controllerOptions,
  brandFavicon,
  onCreate,
  bulkOptions,
  extraBulkActions,
  isLostStatus,
  isKanbanLostStatus,
  viewLinkedDoc,
  lostReasonModal,
  kanbanRequiresRows = false,
  renderKanban,
  renderExtras,
  modals,
  children,
}: DocListPageProps) {
  const route = useRoute()
  const meta = useMeta(doctype)
  const controller = useViewController({
    doctype,
    filters,
    options: controllerOptions,
    brandFavicon,
    isKanbanLostStatus,
  })
  const { list } = controller
  const bulk = useListBulkActions({
    list,
    doctype,
    options: bulkOptions,
    isLostStatus,
    extraActions: extraBulkActions?.(list),
    viewLinkedDoc,
    routeName,
  })

  const data = list.data as AnyRecord | null
  const rows = buildListRows(data, {
    ...rowOptions,
    formatters: {
      getFormattedCurrency: meta.getFormattedCurrency,
      getFormattedFloat: meta.getFormattedFloat,
      getFormattedPercent: meta.getFormattedPercent,
    },
  })
  const columns = alignLastColumn(data?.columns)
  const isKanban = route.params.viewType === 'kanban'

  let body: ReactNode = null
  if (isKanban && renderKanban && (!kanbanRequiresRows || rows.length > 0)) {
    body = renderKanban({ controller, rows })
  } else if (data && rows.length) {
    body = (
      <DocListView
        config={typeof config === 'function' ? config(controller) : config}
        rows={rows}
        columns={columns}
        list={list}
        bulk={bulk}
        options={{ showTooltip: false, resizeColumn: true, rowCount: data.row_count, totalCount: data.total_count }}
        pageLengthCount={data.page_length_count}
        onUpdatePageCount={(count) => controller.updatePageLength(count)}
        onLoadMore={() => controller.loadMore()}
        onColumnWidthUpdated={() => controller.updateColumns()}
        onApplyFilter={(payload) => controller.applyFilter(payload as never)}
        onApplyLikeFilter={() => controller.applyLikeFilter()}
        onLikeDoc={(payload) => controller.likeDoc(payload as never)}
        onSelectionsChanged={(selections) => controller.updateSelections(selections as Set<string>)}
      />
    )
  } else if (data && !rows.length) {
    body = <EmptyState name={emptyName} icon={emptyIcon} />
  }

  return (
    <>
      <LayoutHeader
        left={<ViewBreadcrumbs routeName={routeName} viewControls={controller} />}
        right={
          <>
            {bulk.customListActions.length > 0 && <CustomActions actions={bulk.customListActions as never} />}
            <Button variant="solid" label={__('Create')} iconLeft="lucide-plus" onClick={() => onCreate(controller)} />
          </>
        }
      />
      <ViewControls controller={controller} lostReasonModal={lostReasonModal} />
      {body}
      {children}
      {bulk.modals}
      {renderExtras?.({ controller, rows })}
      {modals}
    </>
  )
}
