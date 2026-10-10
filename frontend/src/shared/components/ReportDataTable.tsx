import { useEffect, useRef } from 'react'
import DataTable from 'frappe-datatable'
import 'frappe-datatable/dist/frappe-datatable.css'
import '../frappe/styles/frappePage.css'

export interface ReportDataColumn {
  fieldname: string
  label?: string
  fieldtype?: string
  width?: number
}

interface ReportDataTableProps {
  columns: ReportDataColumn[]
  rows: Array<Record<string, unknown>>
  format: (value: unknown, column: ReportDataColumn, row: Record<string, unknown>) => string
}

const NUMERIC = new Set(['Currency', 'Float', 'Int', 'Percent'])

export function ReportDataTable({ columns, rows, format }: ReportDataTableProps) {
  const host = useRef<HTMLDivElement>(null)
  const table = useRef<(InstanceType<typeof DataTable> & { layoutName?: string }) | null>(null)

  useEffect(() => {
    const element = host.current
    if (!element) return undefined
    const cols = columns.map((column) => ({
      id: column.fieldname,
      name: column.label ?? column.fieldname,
      width: column.width && column.width > 40 ? column.width : 120,
      editable: false,
      align: NUMERIC.has(String(column.fieldtype)) ? 'right' : 'left',
      format: (value: unknown, cell: unknown) => {
        const row = (cell as { row?: unknown[] })?.row
        void row
        return String(value ?? '')
      },
    }))
    const data = rows.map((row) => columns.map((column) => format(row[column.fieldname], column, row)))
    const total = cols.reduce((sum, column) => sum + column.width, 0)
    const layout = total + 2 < element.clientWidth ? 'fluid' : 'fixed'
    if (table.current && table.current.layoutName !== layout) {
      table.current.destroy?.()
      table.current = null
      element.innerHTML = ''
    }
    if (table.current) {
      table.current.refresh(data, cols)
      return undefined
    }
    table.current = new DataTable(element, {
      columns: cols,
      data,
      inlineFilters: true,
      layout,
      cellHeight: 33,
      showTotalRow: false,
      noDataMessage: 'No report data',
      checkboxColumn: false,
      serialNoColumn: false,
    } as never)
    table.current.layoutName = layout
    return undefined
  }, [columns, rows, format])

  useEffect(
    () => () => {
      table.current?.destroy?.()
      table.current = null
    },
    [],
  )

  return <div ref={host} className="frappe-page-host report-wrapper" />
}
