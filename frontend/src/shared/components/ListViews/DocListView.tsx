import { useRef, type ReactNode } from 'react'
import { isTranslatableDoctype } from '@/core/boot'
import { __ } from '@/core/i18n'
import { resolveLocation, useRoute } from '@/core/navigation'
import type { RouteLocation } from '@/core/navigation/types'
import { useObservable } from '@/core/resources'
import {
  Badge,
  Button,
  Dropdown,
  FormControl,
  ListFooter,
  ListHeader,
  ListHeaderItem,
  ListSelectBanner,
  ListView,
  ListRowItem,
  Tooltip,
  cn,
  formatDuration,
  type ListRowData,
} from '@/design-system'
import type { ListBulkActions } from '../../hooks/useListBulkActions'
import { currentSessionUser } from '../../stores/usersStore'
import type { ViewListResource } from '../../types/view'
import { RatingInput } from '../Controls/RatingInput'
import { HeartIcon } from '../Icons'
import { DocListRows, type DocCellContext } from './DocListRows'
import { WebsiteLink } from './WebsiteLink'

export interface ApplyFilterPayload {
  event: React.MouseEvent
  idx: number
  column: any
  item: any
  firstColumn: any
}

export interface DocCellApi extends DocCellContext {
  columns: any[]
  applyFilter: (event: React.MouseEvent) => void
  isLiked: (item: unknown) => boolean
  emitLike: (name: string, liked: boolean) => void
  getLabel: (label: unknown, column: any) => string
}

export interface DocListConfig {
  doctype: string
  getRowRoute?: (row: ListRowData, route: { viewQuery?: string; viewType?: string }) => RouteLocation
  onRowClick?: (row: ListRowData) => void
  prefix?: (api: DocCellApi) => ReactNode
  fullCell?: (api: DocCellApi) => ReactNode | undefined
  rich?: boolean
  timeColumns?: string[]
  statusBadge?: boolean
  plainDurationKey?: boolean
  htmlTextEditor?: boolean
}

export interface DocListViewProps {
  config: DocListConfig
  rows: ListRowData[]
  columns: any[]
  list: ViewListResource
  bulk: ListBulkActions
  options?: {
    selectable?: boolean
    showTooltip?: boolean
    resizeColumn?: boolean
    totalCount?: number
    rowCount?: number
  }
  pageLengthCount?: number
  className?: string
  onUpdatePageCount?: (value: number) => void
  onLoadMore?: () => void
  onColumnWidthUpdated?: () => void
  onApplyFilter?: (payload: ApplyFilterPayload) => void
  onApplyLikeFilter?: () => void
  onLikeDoc?: (payload: { name: string; liked: boolean }) => void
  onSelectionsChanged?: (selections: Set<string | number>) => void
  renderHtml?: (html: string) => string
}

const RICH_TIME_COLUMNS = ['modified', 'creation', 'first_response_time', 'first_responded_on', 'response_by']
const BASIC_TIME_COLUMNS = ['modified', 'creation']

function getLabel(label: unknown, column: any): string {
  if (column.type === 'Duration') return formatDuration(label as number)
  if (column.options && isTranslatableDoctype(column.options)) return __(label as string)
  return label as string
}

function isLikedBy(item: unknown): boolean {
  if (!item) return false
  const likedByMe = JSON.parse(item as string) as string[]
  return likedByMe.includes(currentSessionUser() ?? '')
}

export function DocListView({
  config,
  rows,
  columns,
  list,
  bulk,
  options = { selectable: true, showTooltip: true, resizeColumn: false, totalCount: 0, rowCount: 0 },
  pageLengthCount,
  className,
  onUpdatePageCount,
  onLoadMore,
  onColumnWidthUpdated,
  onApplyFilter,
  onApplyLikeFilter,
  onLikeDoc,
  onSelectionsChanged,
  renderHtml,
}: DocListViewProps) {
  useObservable(list)
  const route = useRoute()
  const lastPageLength = useRef(pageLengthCount)
  const viewQuery = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view
  const viewType = route.params.viewType
  const rich = config.rich ?? false
  const timeColumns = config.timeColumns ?? (rich ? RICH_TIME_COLUMNS : BASIC_TIME_COLUMNS)
  const isLikeFilterApplied = Boolean(list.params?.filters?._liked_by)

  function patchColumnWidth({ width, save }: { width: string; save: boolean }, key: string) {
    list.setData((current: any) => ({
      ...(current ?? {}),
      columns: (current?.columns ?? []).map((column: any) => (column.key === key ? { ...column, width } : column)),
    }))
    if (save) onColumnWidthUpdated?.()
  }

  function buildApi(context: DocCellContext): DocCellApi {
    return {
      ...context,
      columns,
      applyFilter: (event) =>
        onApplyFilter?.({
          event,
          idx: context.idx,
          column: context.column,
          item: context.item,
          firstColumn: columns[0],
        }),
      isLiked: isLikedBy,
      emitLike: (name, liked) => onLikeDoc?.({ name, liked }),
      getLabel,
    }
  }

  function renderDefaultCell(api: DocCellApi, label: string): ReactNode {
    const { column, item, row, isVisited } = api
    const visitedClass = rich ? (isVisited ? 'text-ink-gray-6' : 'font-medium text-ink-gray-9') : undefined

    if (timeColumns.includes(column.key)) {
      return (
        <div className={cn('truncate text-base', visitedClass)} onClick={api.applyFilter}>
          <Tooltip text={item.label}>
            <div>{item.timeAgo}</div>
          </Tooltip>
        </div>
      )
    }
    if (config.htmlTextEditor && column.type === 'Text Editor') {
      return (
        <div
          className="h-4 truncate text-base [&>p]:truncate"
          dangerouslySetInnerHTML={{ __html: renderHtml ? renderHtml(item) : item }}
        />
      )
    }
    if (config.statusBadge && column.key === 'status') {
      return (
        <div className="truncate text-base">
          <Badge variant="subtle" theme={item.color} size="md" label={__(item.label)} onClick={api.applyFilter} />
        </div>
      )
    }
    if (column.key === '_liked_by') {
      const liked = isLikedBy(item)
      return (
        <div>
          <Button
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation()
              event.preventDefault()
              api.emitLike(row.name, liked)
            }}
          >
            <HeartIcon
              className={cn(
                'h-4 w-4',
                rich
                  ? liked
                    ? isVisited
                      ? 'fill-red-400 text-red-400'
                      : 'fill-red-500 text-red-500'
                    : isVisited
                      ? 'text-ink-gray-6'
                      : 'text-ink-gray-9'
                  : liked && 'fill-red-500 text-red-500',
              )}
            />
          </Button>
        </div>
      )
    }
    if (rich && column.key === 'sla_status') {
      return (
        <div className="truncate text-base">
          {item.value && (
            <Badge variant="subtle" theme={item.color} size="md" label={item.value} onClick={api.applyFilter} />
          )}
        </div>
      )
    }
    if (column.type === 'Check') {
      return (
        <div>
          <FormControl type="checkbox" value={Boolean(item)} disabled className="text-ink-gray-9" />
        </div>
      )
    }
    if (column.type === 'Rating') {
      return (
        <div onClick={api.applyFilter}>
          <RatingInput
            value={item}
            className="flex-nowrap overflow-auto !opacity-100"
            disabled
            max={column.options || 5}
          />
        </div>
      )
    }
    if (config.plainDurationKey && column.key === 'duration') {
      return <div className="truncate text-base">{label}</div>
    }
    if (rich && column.key === 'website' && item?.url) {
      return <WebsiteLink variant="label" url={item.url} label={getLabel(label, column)} />
    }
    if (label) {
      return (
        <div className={cn('truncate text-base', visitedClass)} onClick={api.applyFilter}>
          {getLabel(label, column)}
        </div>
      )
    }
    return null
  }

  function renderCell(context: DocCellContext): ReactNode {
    const api = buildApi(context)
    const full = config.fullCell?.(api)
    if (full !== undefined) return full

    return (
      <ListRowItem
        column={context.column}
        row={context.row}
        item={context.item}
        align={context.column.align}
        className="overflow-hidden"
        prefix={config.prefix?.(api)}
        suffix={
          rich && context.column.key === 'website' && context.item?.url ? (
            <WebsiteLink variant="icon" url={context.item.url} />
          ) : undefined
        }
      >
        {({ label }) => renderDefaultCell(api, label)}
      </ListRowItem>
    )
  }

  function handlePageLength(value: number) {
    if (value === lastPageLength.current) return
    lastPageLength.current = value
    onUpdatePageCount?.(value)
  }

  return (
    <>
      <ListView
        className={className}
        columns={columns}
        rows={rows}
        rowKey="name"
        options={{
          getRowRoute: config.getRowRoute
            ? (row) => resolveLocation(config.getRowRoute!(row, { viewQuery, viewType }))
            : null,
          onRowClick: config.onRowClick ? (row) => config.onRowClick?.(row) : null,
          selectable: options.selectable,
          showTooltip: options.showTooltip,
          resizeColumn: options.resizeColumn,
        }}
        onSelectionsChange={onSelectionsChanged}
      >
        <ListHeader className="mx-3 sm:mx-5" onColumnWidthUpdated={(update) => patchColumnWidth(update, update.key)}>
          {columns.map((column) => (
            <ListHeaderItem
              key={column.key}
              item={column}
              onColumnWidthUpdated={(update) => patchColumnWidth(update, column.key)}
            >
              {column.key === '_liked_by' ? (
                <Button variant="ghost" className="!h-4" onClick={() => onApplyLikeFilter?.()}>
                  <HeartIcon className={cn('h-4 w-4', isLikeFilterApplied && 'fill-red-500 text-red-500')} />
                </Button>
              ) : undefined}
            </ListHeaderItem>
          ))}
        </ListHeader>
        <DocListRows rows={rows} doctype={config.doctype} renderCell={renderCell} />
        <ListSelectBanner
          actions={({ selections, unselectAll }) => (
            <Dropdown options={bulk.bulkActions(selections as Set<string>, unselectAll)}>
              <Button icon="lucide-more-horizontal" variant="ghost" />
            </Dropdown>
          )}
        />
      </ListView>
      {pageLengthCount !== undefined && (
        <div className="border-t px-3 py-2 sm:px-5">
          <ListFooter
            value={pageLengthCount}
            onChange={handlePageLength}
            options={{ rowCount: options.rowCount, totalCount: options.totalCount }}
            onLoadMore={onLoadMore}
          />
        </div>
      )}
      {bulk.modals}
    </>
  )
}
