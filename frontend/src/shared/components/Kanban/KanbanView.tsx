import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { __ } from '@/core/i18n'
import { useObservable } from '@/core/resources'
import { RouteLink } from '@/core/navigation'
import type { RouteLocation } from '@/core/navigation/types'
import { Button, Combobox, Dropdown, Popover } from '@/design-system'
import type { DocRecord } from '../../types/meta'
import type { ViewListResource } from '../../types/view'
import { colors, parseColor } from '../../utils/colors'
import { isTouchScreenDevice } from '../../utils/platform'
import { IndicatorIcon, RefreshIcon } from '../Icons'

interface KanbanColumnMeta {
  name: string
  color?: string
  delete?: boolean
  count?: number
  all_count?: number
  order?: string[]
  page_length?: number
  [key: string]: unknown
}

interface KanbanColumn {
  column: KanbanColumnMeta
  data: DocRecord[]
  fields: string[]
}

export interface KanbanUpdate {
  kanban_columns: KanbanColumnMeta[]
  fetchNewColumns?: boolean
  item?: string
  to?: string
  from?: string
  fromIndex?: number
}

export interface KanbanViewOptions {
  getRoute?: ((row: DocRecord) => RouteLocation) | null
  onClick?: ((row: DocRecord) => void) | null
  onNewClick?: ((column: KanbanColumn) => void) | null
}

export interface KanbanViewProps {
  list: ViewListResource
  options?: KanbanViewOptions
  renderTitle?: (props: { row: DocRecord; titleField: string; itemName: string }) => ReactNode
  renderField?: (props: { row: DocRecord; fieldName: string; itemName: string }) => ReactNode
  renderActions?: (props: { itemName: string }) => ReactNode
  onUpdate: (update: KanbanUpdate) => void
  onLoadMore: (columnName: string) => void
}

const columnId = (name: string) => `kcol:${name}`
const cardId = (name: string) => `kcard:${name}`
const cardsContainerId = (columnName: string) => `kcards:${columnName}`

interface CardData {
  role: 'card'
  columnName: string
  name: string
}

interface ColumnData {
  role: 'column'
  name: string
}

interface ContainerData {
  role: 'cards-container'
  columnName: string
}

const collisionDetection: CollisionDetection = (args) => {
  const activeRole = (args.active.data.current as { role?: string } | undefined)?.role
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((container) => {
      const role = (container.data.current as { role?: string } | undefined)?.role
      if (activeRole === 'column') return role === 'column'
      return role === 'card' || role === 'cards-container'
    }),
  })
}

function SortableBox({
  id,
  data,
  className,
  children,
  dataAttributes,
}: {
  id: string
  data: CardData | ColumnData
  className?: string
  children: ReactNode
  dataAttributes?: Record<string, string>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} className={className} {...dataAttributes} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

function CardsContainer({
  columnName,
  className,
  children,
}: {
  columnName: string
  className?: string
  children: ReactNode
}) {
  const data: ContainerData = { role: 'cards-container', columnName }
  const { setNodeRef } = useDroppable({ id: cardsContainerId(columnName), data })
  return (
    <div ref={setNodeRef} className={className} data-column={columnName}>
      {children}
    </div>
  )
}

export function KanbanView({
  list,
  options = {},
  renderTitle,
  renderField,
  renderActions,
  onUpdate,
  onLoadMore,
}: KanbanViewProps) {
  useObservable(list)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: isTouchScreenDevice() ? 200 : 0, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const data = list.data
  const titleField: string = data?.title_field
  const rawColumns: KanbanColumn[] | null = data?.data && data.view_type === 'kanban' ? data.data : null

  const hasColor = rawColumns?.some((column) => column.column?.color) ?? false
  const columns: KanbanColumn[] = (rawColumns ?? []).map((column, index) =>
    hasColor ? column : { ...column, column: { ...column.column, color: colors[index % colors.length] } },
  )

  const deletedColumns = ((data?.kanban_columns as KanbanColumnMeta[] | undefined) ?? [])
    .filter((column) => column.delete)
    .map((column) => ({ label: column.name, value: column.name }))

  function commit(
    mutate: (next: KanbanColumn[]) => void,
    extra?: Pick<KanbanUpdate, 'item' | 'to' | 'from' | 'fromIndex'>,
    fetchNewColumns = false,
  ) {
    const next: KanbanColumn[] = structuredClone(columns)
    mutate(next)
    list.setData((current: any) => ({ ...(current ?? {}), data: next }))
    const kanbanColumns = next.map((entry) => {
      entry.column.order = entry.data.map((row) => row.name)
      delete entry.column.page_length
      return entry.column
    })
    if (extra && extra.to !== extra.from) onUpdate({ ...extra, kanban_columns: kanbanColumns })
    else onUpdate({ kanban_columns: kanbanColumns, fetchNewColumns })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    const activeData = active.data.current as CardData | ColumnData | undefined
    const overData = over.data.current as CardData | ColumnData | ContainerData | undefined
    if (!activeData || !overData) return

    if (activeData.role === 'column') {
      if (overData.role !== 'column' || active.id === over.id) return
      commit((next) => {
        const from = next.findIndex((entry) => entry.column.name === activeData.name)
        const to = next.findIndex((entry) => entry.column.name === overData.name)
        if (from >= 0 && to >= 0) next.splice(0, next.length, ...arrayMove(next, from, to))
      })
      return
    }

    if (activeData.role !== 'card') return
    const targetColumn =
      overData.role === 'card' ? overData.columnName : overData.role === 'cards-container' ? overData.columnName : null
    if (!targetColumn) return
    const overCardName = overData.role === 'card' ? overData.name : null

    const sourceColumn = columns.find((entry) => entry.column.name === activeData.columnName)
    const fromIndex = sourceColumn?.data.findIndex((row) => row.name === activeData.name) ?? -1
    if (activeData.columnName === targetColumn && (overCardName === null || overCardName === activeData.name)) return

    commit(
      (next) => {
        const source = next.find((entry) => entry.column.name === activeData.columnName)
        const target = next.find((entry) => entry.column.name === targetColumn)
        if (!source || !target) return
        const index = source.data.findIndex((row) => row.name === activeData.name)
        if (index < 0) return
        const [moved] = source.data.splice(index, 1)
        const targetIndex = overCardName ? target.data.findIndex((row) => row.name === overCardName) : -1
        if (targetIndex < 0) target.data.push(moved!)
        else target.data.splice(targetIndex, 0, moved!)
      },
      { item: activeData.name, to: targetColumn, from: activeData.columnName, fromIndex },
    )
  }

  function setColumnColor(name: string, color: string) {
    commit((next) => {
      const target = next.find((entry) => entry.column.name === name)
      if (target) target.column.color = color
    })
  }

  function deleteColumn(name: string) {
    commit((next) => {
      const target = next.find((entry) => entry.column.name === name)
      if (target) target.column.delete = true
    })
  }

  function addColumn(name: string) {
    commit((next) => {
      const index = next.findIndex((entry) => entry.column.name === name)
      if (index < 0) return
      const [column] = next.splice(index, 1)
      column!.column.delete = false
      next.push(column!)
    })
  }

  if (!rawColumns) return <div className="flex h-full overflow-x-auto" />

  const visibleColumns = columns.filter((entry) => !entry.column.delete)

  return (
    <div className="flex h-full overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
        <SortableContext
          items={visibleColumns.map((entry) => columnId(entry.column.name))}
          strategy={horizontalListSortingStrategy}
        >
          <div className="mx-2 flex pb-3.5 sm:mx-2.5">
            {visibleColumns.map((column) => (
              <SortableBox
                key={column.column.name}
                id={columnId(column.column.name)}
                data={{ role: 'column', name: column.column.name }}
                className="flex w-72 min-w-72 flex-col gap-2.5 rounded-lg p-2.5 hover:bg-surface-gray-2"
              >
                <div className="group flex items-center justify-between gap-2">
                  <div className="flex items-center text-base">
                    <Popover
                      target={({ togglePopover }) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:!bg-surface-gray-2"
                          onClick={() => togglePopover()}
                        >
                          <IndicatorIcon className={parseColor(column.column.color ?? '')} />
                        </Button>
                      )}
                      body={() => (
                        <div className="flex min-w-40 flex-col gap-3 rounded-lg bg-surface-elevation-2 px-3 py-2.5 shadow-2xl ring-1 ring-black/5 focus:outline-none">
                          <div className="flex gap-1">
                            {colors.map((color) => (
                              <Button
                                key={color}
                                variant="ghost"
                                onClick={() => setColumnColor(column.column.name, color)}
                              >
                                <IndicatorIcon className={parseColor(color)} />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    />
                    <div className="text-ink-gray-9">{column.column.name}</div>
                  </div>
                  <div className="flex">
                    <Dropdown
                      options={[
                        {
                          group: __('Options'),
                          hideLabel: true,
                          items: [
                            {
                              label: __('Delete'),
                              icon: 'lucide-trash-2',
                              onClick: () => deleteColumn(column.column.name),
                            },
                          ],
                        },
                      ]}
                    >
                      <Button
                        className="pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                        icon="lucide-more-horizontal"
                        variant="ghost"
                      />
                    </Dropdown>
                    <Button icon="lucide-plus" variant="ghost" onClick={() => options.onNewClick?.(column)} />
                  </div>
                </div>
                <div className="flex h-full flex-col gap-2 overflow-y-auto">
                  <SortableContext
                    items={column.data.map((row) => cardId(row.name))}
                    strategy={verticalListSortingStrategy}
                  >
                    <CardsContainer columnName={column.column.name} className="flex flex-1 flex-col gap-3.5">
                      {column.data.map((row) => {
                        const card = (
                          <>
                            {renderTitle ? (
                              renderTitle({ row, titleField, itemName: row.name })
                            ) : (
                              <div className="flex h-5 items-center">
                                {row[titleField] ? (
                                  <div>{row[titleField]}</div>
                                ) : (
                                  <div className="text-ink-gray-4">{__('No Title')}</div>
                                )}
                              </div>
                            )}
                            <div className="my-2.5 h-px border-b" />
                            <div className="flex flex-col gap-3.5">
                              {column.fields?.map((fieldName) => (
                                <Fragment key={fieldName}>
                                  {renderField ? (
                                    renderField({ row, fieldName, itemName: row.name })
                                  ) : row[fieldName] ? (
                                    <div className="truncate">{row[fieldName]}</div>
                                  ) : null}
                                </Fragment>
                              ))}
                            </div>
                            <div className="mb-2 mt-2.5 h-px border-b" />
                            {renderActions ? (
                              renderActions({ itemName: row.name })
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div />
                                <Button
                                  icon="lucide-plus"
                                  variant="ghost"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    event.preventDefault()
                                  }}
                                />
                              </div>
                            )}
                          </>
                        )
                        const cardClass =
                          'flex flex-col rounded-lg border bg-surface-base px-3.5 pb-2.5 pt-3 text-base text-ink-gray-9'
                        return (
                          <SortableBox
                            key={row.name}
                            id={cardId(row.name)}
                            data={{ role: 'card', columnName: column.column.name, name: row.name }}
                            dataAttributes={{ 'data-name': row.name }}
                          >
                            {options.getRoute ? (
                              <RouteLink to={options.getRoute(row)} className={cardClass}>
                                {card}
                              </RouteLink>
                            ) : (
                              <div
                                className={cardClass}
                                onClick={options.onClick ? () => options.onClick?.(row) : undefined}
                              >
                                {card}
                              </div>
                            )}
                          </SortableBox>
                        )
                      })}
                    </CardsContainer>
                  </SortableContext>
                  {(column.column.count ?? 0) < (column.column.all_count ?? 0) && (
                    <div className="flex items-center justify-center">
                      <Button label={__('Load More')} onClick={() => onLoadMore(column.column.name)} />
                    </div>
                  )}
                </div>
              </SortableBox>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="min-w-64 shrink-0">
        <Combobox
          value={null}
          options={deletedColumns}
          onSelectedOptionChange={(option) => {
            if (option && option.type !== 'custom') addColumn(String(option.value))
          }}
          trigger={({ open, setOpen }) => (
            <Button
              className="mb-1 mr-5 mt-2.5 w-full"
              label={__('Add Column')}
              iconLeft="lucide-plus"
              onClick={() => setOpen(!open)}
            />
          )}
          footer={() => (
            <Button
              className="w-full"
              label={__('Reload Columns')}
              iconLeft={RefreshIcon}
              onClick={() => commit(() => undefined, undefined, true)}
            />
          )}
        />
      </div>
    </div>
  )
}
