import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import type { ListGroupData, ListRowData, ListRowRenderContext } from '../../types/listView'
import { cn } from '../../utils/cn'
import { alignClass, getGridTemplateColumns } from '../../utils/listView'
import { Checkbox } from '../Checkbox'
import { ListRowItem } from './ListRowItem'

export interface ListRowProps {
  row: ListRowData
  children?: ReactNode | ((context: ListRowRenderContext) => ReactNode)
}

function roundedClassFor(row: ListRowData, list: ReturnType<typeof useListView>, isSelected: boolean): string {
  if (!isSelected) return 'rounded'
  const selections = [...list.selections]
  const groups: ListRowData[][] = list.rows[0]?.group ? list.rows.map((group) => group.rows ?? []) : [list.rows]

  for (const rows of groups) {
    const index = rows.findIndex((candidate) => candidate === row)
    if (index === -1) continue
    const atBottom = !selections.includes(rows[index + 1]?.name)
    const atTop = !selections.includes(rows[index - 1]?.name)
    return (atBottom ? 'rounded-b ' : '') + (atTop ? 'rounded-t' : '')
  }
  return 'rounded'
}

export function ListRow({ row, children }: ListRowProps) {
  const list = useListView()
  const rowValue = row[list.rowKey] as string | number
  const route = list.options.getRowRoute?.(row)
  const isExternal = typeof route === 'string' && route.startsWith('http')
  const isSelected = list.selections.has(rowValue)
  const isActive = list.options.enableActive && list.activeRow === row.name
  const isHoverable = Boolean(list.options.getRowRoute || list.options.onRowClick)
  const flatRows: ListRowData[] = list.rows.find((candidate) => candidate.group)
    ? list.rows.reduce<ListRowData[]>((all, group) => all.concat((group as ListGroupData).rows), [])
    : list.rows
  const lastRow = list.rows[list.rows.length - 1]
  const isLastRow = list.rows.length > 0 && lastRow !== undefined && lastRow[list.rowKey] === rowValue
  const rowHeight = typeof list.options.rowHeight === 'number' ? `${list.options.rowHeight}px` : list.options.rowHeight
  const roundedClass = roundedClassFor(row, list, isSelected)

  const onRowClick = (event: React.MouseEvent) => {
    if (row.disabled) return
    list.options.onRowClick?.(row, event)
    list.setActiveRow(list.activeRow === row.name ? null : (row.name as string))
  }

  const handleCheckboxClick = (event: React.MouseEvent) => {
    if (row.disabled) return
    if (event.shiftKey && !list.selections.has(rowValue)) {
      const lastSelected = Array.from(list.selections).pop()
      const lastIndex = flatRows.findIndex((candidate) => lastSelected === candidate[list.rowKey])
      const currentIndex = flatRows.findIndex((candidate) => rowValue === candidate[list.rowKey])
      const start = Math.min(lastIndex, currentIndex)
      const end = Math.max(lastIndex, currentIndex)
      const next = new Set(list.selections)
      for (let index = start; index <= end; index++) {
        const candidate = flatRows[index]
        if (!candidate || candidate.disabled) continue
        next.add(candidate[list.rowKey])
      }
      list.setSelections(next)
      return
    }
    list.toggleRow(rowValue, row.disabled)
  }

  const outerClass = cn(
    roundedClass,
    (isSelected || isActive) && 'bg-surface-gray-2',
    isHoverable && !row.disabled && 'cursor-pointer',
    isHoverable && !row.disabled && (isSelected || isActive ? 'hover:bg-surface-gray-3' : 'hover:bg-surface-sidebar'),
    row.disabled && 'pointer-events-none',
    'flex flex-col transition-all duration-300 ease-in-out',
  )

  const disabledProps = row.disabled ? { 'aria-disabled': true as const, tabIndex: -1 } : {}

  const inner = (
    <>
      <div
        className={cn('grid items-center gap-4 px-2', row.disabled && 'cursor-not-allowed opacity-50')}
        style={{
          height: rowHeight,
          gridTemplateColumns: getGridTemplateColumns(list.columns, list.options.selectable),
        }}
      >
        {list.options.selectable && (
          <div
            className="w-fit pe-2 py-3 flex"
            onClick={(event) => {
              event.stopPropagation()
              event.preventDefault()
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <Checkbox
              value={isSelected}
              disabled={row.disabled}
              className="cursor-pointer duration-300"
              onChange={() => undefined}
              onClick={(event) => {
                event.stopPropagation()
                handleCheckboxClick(event)
              }}
            />
          </div>
        )}

        {list.columns.map((column, index) => {
          const item = row[column.key]
          const context: ListRowRenderContext = { idx: index, column, item, isActive }
          return (
            <div
              key={column.key}
              className={cn(
                alignClass(column.align),
                'text-ink-gray-9',
                'overflow-x-hidden',
              )}
            >
              {typeof children === 'function'
                ? children(context)
                : (children ??
                  (list.renderers.cell ? (
                    list.renderers.cell({ column, row, item, align: column.align })
                  ) : (
                    <ListRowItem column={column} row={row} item={item} align={column.align} />
                  )))}
            </div>
          )
        })}
      </div>

      {!isLastRow && (
        <div
          className={cn(
            'h-px border-t',
            roundedClass === 'rounded' || roundedClass.includes('rounded-b')
              ? 'mx-2 border-outline-gray-1'
              : 'border-t-(--surface-gray-2)',
          )}
        />
      )}
    </>
  )

  const wrapper = list.options.getRowRoute ? (
    <div className="contents">{inner}</div>
  ) : (
    <button type="button" className="[all:unset] hover:[all:unset]">
      {inner}
    </button>
  )

  if (route && !row.disabled) {
    return isExternal ? (
      <a className={outerClass} href={route as string} onClick={onRowClick} {...disabledProps}>
        {wrapper}
      </a>
    ) : (
      <Link className={outerClass} to={route} onClick={onRowClick} {...disabledProps}>
        {wrapper}
      </Link>
    )
  }

  return (
    <div className={outerClass} onClick={onRowClick} {...disabledProps}>
      {wrapper}
    </div>
  )
}
