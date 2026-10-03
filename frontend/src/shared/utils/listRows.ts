import type { ListRowData } from '@/design-system'
import { __ } from '@/core/i18n'
import { formatDate } from './date'

type AnyRecord = Record<string, any>

export interface RowFormatters {
  getFormattedCurrency: (fieldname: string, doc: AnyRecord) => string
  getFormattedFloat: (fieldname: string, doc: AnyRecord) => string
  getFormattedPercent: (fieldname: string, doc: AnyRecord) => string
}

export type CellBuilders = Record<string, (record: AnyRecord) => unknown>

export interface BuildRowsOptions {
  formatters: RowFormatters
  cells?: CellBuilders
  extraKeys?: string[]
  skipDateFormat?: string[]
  rowCell?: (row: string, record: AnyRecord, columns: AnyRecord[]) => unknown
  flat?: boolean
  groupIcon?: (fieldname: string, option: string) => (() => React.ReactElement) | undefined
}

export function alignLastColumn<T extends AnyRecord>(columns: T[] | null | undefined): T[] {
  const list = columns ?? []
  if (!list.length) return list
  return list.map((column, index) => (index === list.length - 1 ? { ...column, align: 'right' } : column))
}

function parseRecords(
  records: AnyRecord[],
  data: AnyRecord,
  columns: AnyRecord[],
  { formatters, cells = {}, extraKeys = [], skipDateFormat = ['modified', 'creation'], rowCell }: BuildRowsOptions,
): ListRowData[] {
  const isKanban = data.view_type === 'kanban'
  const keyName = isKanban ? 'fieldname' : 'key'
  const typeName = isKanban ? 'fieldtype' : 'type'

  return records.map((record) => {
    const parsed: AnyRecord = {}
    ;(data.rows as string[]).forEach((row) => {
      if (rowCell) {
        parsed[row] = rowCell(row, record, columns)
        return
      }
      parsed[row] = record[row]
      const fieldType = columns?.find((column) => (column[keyName] || column.value) === row)?.[typeName]

      if (fieldType && ['Date', 'Datetime'].includes(fieldType) && !skipDateFormat.includes(row)) {
        parsed[row] = formatDate(record[row], '', true, fieldType === 'Datetime')
      }
      if (fieldType === 'Currency') parsed[row] = formatters.getFormattedCurrency(row, record)
      if (fieldType === 'Float') parsed[row] = formatters.getFormattedFloat(row, record)
      if (fieldType === 'Percent') parsed[row] = formatters.getFormattedPercent(row, record)

      const build = cells[row]
      if (build) parsed[row] = build(record)
    })
    for (const key of extraKeys) parsed[key] = record[key]
    return parsed
  })
}

export function buildListRows(data: AnyRecord | null | undefined, options: BuildRowsOptions): ListRowData[] {
  if (!data?.data) return []

  if (options.flat) {
    if (!['list', 'group_by'].includes(data.view_type)) return []
    return parseRecords(data.data, data, data.columns, options)
  }

  if (data.view_type === 'group_by') {
    const groupBy = data.group_by_field
    if (!groupBy?.fieldname) return []
    return (groupBy.options ?? []).map((option: string) => {
      const filtered = (data.data as AnyRecord[]).filter((record) =>
        !option ? !record[groupBy.fieldname] : record[groupBy.fieldname] === option,
      )
      const group: ListRowData = {
        label: groupBy.label,
        group: option || __(' '),
        collapsed: false,
        rows: parseRecords(filtered, data, data.columns, options),
      }
      const icon = groupBy.fieldname === 'status' ? options.groupIcon?.('status', option) : undefined
      if (icon) group.icon = icon
      return group
    })
  }

  if (data.view_type === 'kanban') {
    const flattened: AnyRecord[] = []
    ;(data.data as AnyRecord[]).forEach((column) => {
      column.data?.forEach((record: AnyRecord) => flattened.push(record))
    })
    return parseRecords(flattened, data, data.fields, options)
  }

  return parseRecords(data.data, data, data.columns, options)
}

export function getRowCell(rows: ListRowData[], name: string, field: string): AnyRecord {
  const row = rows.find((candidate) => candidate.name === name)
  const value = row?.[field]
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  return { label: value }
}
