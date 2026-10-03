import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import { ListViewContext } from '../../hooks/useListView'
import type {
  ListColumn,
  ListGroupData,
  ListOptions,
  ListRowData,
  ListViewContextValue,
  ListViewRenderers,
  ResolvedListOptions,
} from '../../types/listView'
import { cn } from '../../utils/cn'
import { ListEmptyState } from './ListEmptyState'
import { ListGroups } from './ListGroups'
import { ListHeader } from './ListHeader'
import { ListRows } from './ListRows'
import { ListSelectBanner } from './ListSelectBanner'

export interface ListViewHandle {
  selections: Set<string | number>
  allRowsSelected: boolean
  toggleRow: (key: string | number, disabled?: boolean) => void
  toggleAllRows: (select?: boolean) => void
}

export interface ListViewProps extends ListViewRenderers {
  columns?: ListColumn[]
  rows?: ListRowData[]
  rowKey: string
  options?: ListOptions
  selections?: Set<string | number>
  onSelectionsChange?: (selections: Set<string | number>) => void
  onActiveRowChange?: (row: string | number | null) => void
  className?: string
  style?: CSSProperties
  handleRef?: Ref<ListViewHandle>
  children?: ReactNode | ((context: { showGroupedRows: boolean; selectable: boolean }) => ReactNode)
}

function resolveOptions(options: ListOptions | undefined): ResolvedListOptions {
  const source = options ?? {}
  return {
    getRowRoute: source.getRowRoute ?? null,
    onRowClick: source.onRowClick ?? null,
    showTooltip: source.showTooltip ?? true,
    selectionText: source.selectionText ?? ((count) => (count === 1 ? '1 row selected' : `${count} rows selected`)),
    enableActive: source.enableActive ?? false,
    selectable: source.selectable ?? true,
    resizeColumn: source.resizeColumn ?? false,
    rowHeight: source.rowHeight || 40,
    emptyState: source.emptyState,
  }
}

export function ListView({
  columns = [],
  rows = [],
  rowKey,
  options,
  selections: controlledSelections,
  onSelectionsChange,
  onActiveRowChange,
  className,
  style,
  handleRef,
  children,
  cell,
  groupHeader,
  groupEmpty,
}: ListViewProps) {
  const [internalSelections, setInternalSelections] = useState<Set<string | number>>(() => new Set())
  const [activeRow, setActiveRowState] = useState<string | number | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const selections = controlledSelections ?? internalSelections
  const resolved = useMemo(() => resolveOptions(options), [options])

  const showGroupedRows = rows.every((row) => row.group && Array.isArray(row.rows))
  const flatRows = useMemo(
    () => (showGroupedRows ? rows.flatMap((row) => row.rows ?? []) : rows),
    [rows, showGroupedRows],
  )

  const enabledTotal = flatRows.filter((row) => !row.disabled).length
  const allRowsSelected = rows.length > 0 && enabledTotal > 0 && selections.size === enabledTotal

  const setActiveRow = useCallback(
    (value: string | number | null) => {
      setActiveRowState(value)
      onActiveRowChange?.(value)
    },
    [onActiveRowChange],
  )

  const setSelections = useCallback(
    (next: Set<string | number>) => {
      setInternalSelections(next)
      if (next.size) setActiveRow(null)
      onSelectionsChange?.(next)
    },
    [onSelectionsChange, setActiveRow],
  )

  const toggleRow = useCallback(
    (key: string | number, disabled?: boolean) => {
      const next = new Set(selections)
      if (!next.delete(key) && !disabled) next.add(key)
      setSelections(next)
    },
    [selections, setSelections],
  )

  const toggleAllRows = useCallback(
    (select?: boolean) => {
      if (!select || allRowsSelected) {
        setSelections(new Set())
        return
      }
      const next = new Set(selections)
      for (const row of flatRows) {
        if (!row.disabled) next.add(row[rowKey])
      }
      setSelections(next)
    },
    [allRowsSelected, flatRows, rowKey, selections, setSelections],
  )

  const isGroupCollapsed = useCallback(
    (group: ListGroupData) => collapsed[group.group] ?? group.collapsed ?? false,
    [collapsed],
  )

  const toggleGroup = useCallback((group: ListGroupData) => {
    setCollapsed((current) => ({ ...current, [group.group]: !(current[group.group] ?? group.collapsed ?? false) }))
  }, [])

  useImperativeHandle(handleRef, () => ({ selections, allRowsSelected, toggleRow, toggleAllRows }), [
    selections,
    allRowsSelected,
    toggleRow,
    toggleAllRows,
  ])

  const context: ListViewContextValue = {
    rowKey,
    rows,
    columns,
    options: resolved,
    selections,
    activeRow,
    allRowsSelected,
    renderers: { cell, groupHeader, groupEmpty },
    setActiveRow,
    setSelections,
    toggleRow,
    toggleAllRows,
    isGroupCollapsed,
    toggleGroup,
  }

  const defaultContent = (
    <>
      <ListHeader />
      {rows.length ? showGroupedRows ? <ListGroups /> : <ListRows /> : <ListEmptyState />}
      {resolved.selectable && <ListSelectBanner />}
    </>
  )

  return (
    <ListViewContext.Provider value={context}>
      <div className="relative flex w-full flex-1 flex-col overflow-x-auto">
        <div className={cn('flex w-max min-w-full flex-col overflow-y-hidden', className)} style={style}>
          {children === undefined
            ? defaultContent
            : typeof children === 'function'
              ? children({ showGroupedRows, selectable: resolved.selectable })
              : children}
        </div>
      </div>
    </ListViewContext.Provider>
  )
}
