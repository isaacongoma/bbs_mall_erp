import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import type { ListAlign, ListColumn, ListRowData } from '../../types/listView'
import { cn } from '../../utils/cn'
import { alignClass } from '../../utils/listView'
import { Tooltip } from '../Tooltip'

export interface ListRowItemProps {
  column?: ListColumn
  row?: ListRowData
  item?: unknown
  align?: ListAlign
  className?: string
  prefix?: ReactNode
  suffix?: ReactNode
  children?: ReactNode | ((context: { label: string }) => ReactNode)
}

function readValue(value: unknown): { label?: string; [key: string]: unknown } {
  if (value && typeof value === 'object') return value as { label?: string }
  return { label: value as string }
}

export function ListRowItem({
  column,
  row,
  item = '',
  align = 'left',
  className,
  prefix,
  suffix,
  children,
}: ListRowItemProps) {
  const list = useListView()
  const safeRow = row ?? {}
  const value = readValue(item)
  const label = column?.getLabel ? column.getLabel({ row: safeRow }) : (value.label ?? '')
  const tooltip = !list.options.showTooltip ? '' : column?.getTooltip ? column.getTooltip(safeRow) : (value.label ?? '')

  const resolvedPrefix =
    prefix ??
    (column?.prefix ? (typeof column.prefix === 'function' ? column.prefix({ row: safeRow }) : column.prefix) : null)

  const rendered = typeof children === 'function' ? children({ label: String(label) }) : children
  const content: ReactElement = isValidElement(rendered) ? (
    rendered
  ) : (
    <div className="truncate text-base">{rendered ?? String(label)}</div>
  )

  return (
    <div className={cn('flex items-center gap-2', alignClass(align), className)}>
      {resolvedPrefix}
      <Tooltip text={list.options.showTooltip ? tooltip : ''}>{content}</Tooltip>
      {suffix}
    </div>
  )
}
