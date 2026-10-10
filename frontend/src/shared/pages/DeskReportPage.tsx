import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useRoute } from '@/core/navigation'
import { useResource } from '@/core/resources'
import { __ } from '@/core/i18n'
import { AxisChart, Button, Dialog, Dropdown, ErrorMessage, FormControl, usePageMeta } from '@/design-system'
import { Icon } from '../components/Icon'
import { ReportShimmer } from '../components/Shimmer'
import { ModernStatCard } from '../components/ModernStat'
import { ReportDataTable } from '../components/ReportDataTable'
import { LayoutHeader } from '../components/LayoutHeader'
import { downloadCsv } from '../utils/csv'
import { ReportFilterControl } from '../components/ReportFilterControl'
import { renderFieldLayoutDialog } from '../utils/renderFieldLayoutDialog'
import { rpc } from '@/core/api/rpc'
import { useReportSettings } from '../hooks/useReportSettings'
import { installReport, type ReportFilterDef } from '../frappe/queryReport'

interface ReportColumn {
  fieldname: string
  label?: string
  fieldtype?: string
}

interface ReportResult {
  columns?: ReportColumn[]
  result?: Array<Record<string, unknown>>
  report_summary?: Array<Record<string, unknown>>
  message?: string | null
  chart?: Record<string, any> | null
  prepared_report?: boolean
  doc?: Record<string, any> | null
  execution_time?: number
}

interface ReportDefinition {
  filters?: ReportFilterDef[]
  ref_doctype?: string
  prepared_report?: boolean
}

function formatCell(value: unknown, column: ReportColumn & { options?: string }, row: Record<string, unknown>): string {
  if (value === null || value === undefined || value === '') return ''
  const indent = column.fieldname === 'account' ? Number(row.indent ?? 0) : 0
  if (indent > 0) return '    '.repeat(indent) + String(value)
  const scope = window as unknown as Record<string, any>
  const type = String(column.fieldtype ?? '')
  try {
    if (type === 'Currency' && typeof scope.format_currency === 'function') {
      const currency = column.options ? String(row[column.options] ?? column.options) : undefined
      return String(scope.format_currency(value, currency))
    }
    if ((type === 'Float' || type === 'Percent') && typeof scope.format_number === 'function')
      return String(scope.format_number(value))
  } catch {
    return String(value)
  }
  return String(value).replace(/^'(.*)'$/, '$1')
}

function dependsOk(filter: ReportFilterDef, values: Record<string, unknown>): boolean {
  const expression = typeof filter.depends_on === 'string' ? filter.depends_on : ''
  if (!expression) return true
  if (!expression.startsWith('eval:')) return Boolean(values[expression])
  const body = expression.slice(5)
  try {
    return Boolean(
      new Function('doc', 'report', `return (${body})`)(values, { get_filter_value: (name: string) => values[name] }),
    )
  } catch {
    return true
  }
}

function readableError(error: unknown): string {
  const text = String((error as { message?: unknown })?.message ?? error)
  try {
    const parsed = JSON.parse(text) as { _server_messages?: string; exception?: string }
    if (parsed._server_messages) {
      const messages = (JSON.parse(parsed._server_messages) as string[]).map(
        (entry) => (JSON.parse(entry) as { message?: string }).message ?? '',
      )
      return messages.join(' ')
    }
    return parsed.exception ?? text
  } catch {
    return text
  }
}

function parseFilters(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const COLLAPSED_FILTERS = 6
const NO_FILTERS: ReportFilterDef[] = []

export default function DeskReportPage() {
  const route = useRoute()
  const report = decodeURIComponent(route.params.report ?? '')
  const [filterText] = useState('{}')
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [visibleColumnNames, setVisibleColumnNames] = useState<string[] | null>(null)
  const [showColumns, setShowColumns] = useState(false)
  const [preparedReportName, setPreparedReportName] = useState('')
  const [defaultReport, setDefaultReport] = useState(
    () => window.localStorage.getItem(`desk-default-report:${report}`) === 'true',
  )
  const definition = useResource<ReportDefinition>({
    url: 'frappe.desk.query_report.get_script',
    params: { report_name: report },
    auto: true,
    initialData: {},
    transform: (response: unknown) => {
      if (response && typeof response === 'object' && 'message' in response) {
        const message = (response as Record<string, unknown>).message
        return message && typeof message === 'object' ? (message as ReportDefinition) : {}
      }
      return response && typeof response === 'object' ? (response as ReportDefinition) : {}
    },
  })
  const resource = useResource<ReportResult>({
    url: 'frappe.desk.query_report.run',
    params: { report_name: report, filters },
    auto: false,
    transform: (response: { message?: ReportResult | string | null } | ReportResult): ReportResult => {
      if ('message' in response && response.message && typeof response.message === 'object') return response.message
      return response as ReportResult
    },
  })
  const { settings, facade } = useReportSettings(report, definition.data?.filters ?? NO_FILTERS)
  const reportFilters = facade?.filterDefs ?? definition.data?.filters ?? []
  const visibleFilters = reportFilters.filter(
    (filter) => !filter.hidden && !facade?.hiddenFilters.has(filter.fieldname) && dependsOk(filter, filters),
  )
  const nonBreakFilters = [
    ...visibleFilters.filter((filter) => filter.fieldtype !== 'Break' && filter.fieldtype !== 'Check'),
    ...visibleFilters.filter((filter) => filter.fieldtype === 'Check'),
  ]
  const checkStart = nonBreakFilters.findIndex((filter) => filter.fieldtype === 'Check')
  const orderedFilters: ReportFilterDef[] =
    checkStart > 0
      ? [...nonBreakFilters.slice(0, checkStart), { fieldtype: 'Break', fieldname: '' } as ReportFilterDef, ...nonBreakFilters.slice(checkStart)]
      : nonBreakFilters
  const collapsible = nonBreakFilters.length > COLLAPSED_FILTERS
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [missingFilters, setMissingFilters] = useState<string[]>([])
  const resourceRef = useRef(resource)
  useEffect(() => {
    resourceRef.current = resource
  })

  useEffect(() => {
    if (!facade) return undefined
    const execute = () => {
      const values: Record<string, unknown> = { ...facade.values }
      for (const def of facade.filterDefs) if (!dependsOk(def, values)) delete values[def.fieldname]
      setFilters(values)
      const lacking = facade.filterDefs
        .filter(
          (def) =>
            def.reqd &&
            def.fieldtype !== 'Break' &&
            !def.hidden &&
            !facade.hiddenFilters.has(def.fieldname) &&
            dependsOk(def, values) &&
            (values[def.fieldname] === undefined || values[def.fieldname] === null || values[def.fieldname] === ''),
        )
        .map((def) => def.fieldname)
      setMissingFilters(lacking)
      if (lacking.length) return
      resourceRef.current.update({ params: { report_name: report, filters: values } })
      void resourceRef.current.reload()
    }
    installReport(facade)
    facade.bind(execute)
    const unsubscribe = facade.subscribe(() => setFilters({ ...facade.values }))
    if (typeof settings.onload === 'function') settings.onload(facade)
    for (const def of facade.filterDefs) {
      if (typeof def.on_change === 'function' && facade.values[def.fieldname] !== undefined) def.on_change(facade)
    }
    execute()
    return () => {
      unsubscribe()
      installReport(null)
    }
  }, [facade, settings, report])

  const data = resource.data ?? {}
  const columns = useMemo(
    () => (data.columns ?? []).filter((column) => !(column as { hidden?: unknown }).hidden),
    [data.columns],
  )
  const allRows = useMemo(() => data.result ?? [], [data.result])
  const isTree = Boolean(settings.tree) && allRows.some((row) => row && typeof row === 'object' && 'indent' in row)
  const [depth, setDepth] = useState<number | null>(null)
  const level = depth ?? Number(settings.initial_depth ?? 3)
  const rows = useMemo(
    () => (isTree ? allRows.filter((row) => Number(row.indent ?? 0) < level) : allRows),
    [allRows, isTree, level],
  )
  const visibleColumns = useMemo(
    () => (visibleColumnNames ? columns.filter((column) => visibleColumnNames.includes(column.fieldname)) : columns),
    [columns, visibleColumnNames],
  )
  const summary = useMemo(() => data.report_summary ?? [], [data.report_summary])
  const chart = data.chart
  const exportColumns = visibleColumns.map((column) => ({
    key: column.fieldname,
    label: column.label ?? column.fieldname,
  }))
  const numericColumns = visibleColumns.filter((column) =>
    ['Currency', 'Float', 'Int', 'Percent'].includes(String(column.fieldtype)),
  )
  const [actionError, setActionError] = useState<string | null>(null)

  usePageMeta({ title: report })

  function run() {
    const next = { ...parseFilters(filterText), ...filters }
    setFilters(next)
    resource.update({ params: { report_name: report, filters: next } })
    void resource.reload()
  }

  async function addNumberCard() {
    if (!numericColumns.length) return
    const values = await renderFieldLayoutDialog({
      title: __('Add Number Card'),
      fields: [
        {
          fieldname: 'report_field',
          fieldtype: 'Select',
          label: __('Field'),
          options: numericColumns.map((column) => column.fieldname).join('\n'),
          reqd: 1,
        },
        {
          fieldname: 'report_function',
          fieldtype: 'Select',
          label: __('Function'),
          options: 'Sum\nAverage\nMinimum\nMaximum',
          default: 'Sum',
          reqd: 1,
        },
        { fieldname: 'dashboard', fieldtype: 'Link', label: __('Dashboard'), options: 'Dashboard' },
        { fieldname: 'label', fieldtype: 'Data', label: __('Card Label') },
      ],
      submitLabel: __('Add'),
    })
    if (!values) return
    setActionError(null)
    try {
      await rpc({
        url: 'frappe.desk.doctype.number_card.number_card.create_report_number_card',
        method: 'POST',
        params: {
          args: JSON.stringify({
            ...values,
            type: 'Report',
            report_name: report,
            filters_json: JSON.stringify(filters),
          }),
        },
      })
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  async function addChart() {
    const values = await renderFieldLayoutDialog({
      title: __('Add Chart to Dashboard'),
      fields: [
        { fieldname: 'dashboard', fieldtype: 'Link', label: __('Dashboard'), options: 'Dashboard' },
        { fieldname: 'chart_name', fieldtype: 'Data', label: __('Chart Name'), default: report },
        {
          fieldname: 'type',
          fieldtype: 'Select',
          label: __('Chart Type'),
          options: 'Line\nBar\nDonut\nPercentage',
          default: 'Line',
          reqd: 1,
        },
      ],
      submitLabel: __('Add'),
    })
    if (!values) return
    setActionError(null)
    try {
      await rpc({
        url: 'frappe.desk.doctype.dashboard_chart.dashboard_chart.create_report_chart',
        method: 'POST',
        params: {
          args: JSON.stringify({
            ...values,
            chart_type: 'Report',
            report_name: report,
            filters_json: JSON.stringify(filters),
            use_report_chart: 1,
          }),
        },
      })
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  async function saveCustomReport() {
    const values = await renderFieldLayoutDialog({
      title: __('Save Report'),
      fields: [
        { fieldname: 'report_name', fieldtype: 'Data', label: __('Report Name'), default: `${report} Custom`, reqd: 1 },
      ],
      submitLabel: __('Save'),
    })
    if (!values?.report_name) return
    setActionError(null)
    try {
      await rpc({
        url: 'frappe.desk.query_report.save_report',
        method: 'POST',
        params: {
          reference_report: report,
          report_name: values.report_name,
          columns: JSON.stringify(visibleColumns),
          filters: JSON.stringify(filters),
        },
      })
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  async function prepareReport() {
    setActionError(null)
    try {
      const response = await rpc<{ message?: { name?: string } | string }>({
        url: 'frappe.core.doctype.prepared_report.prepared_report.make_prepared_report',
        method: 'POST',
        params: { report_name: report, filters: JSON.stringify(filters) },
      })
      const value = response?.message
      const name = typeof value === 'string' ? value : value?.name
      if (!name) return
      setPreparedReportName(name)
      const nextFilters = { ...filters, prepared_report_name: name }
      resource.update({ params: { report_name: report, filters: nextFilters } })
      void resource.reload()
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  function printReport() {
    void (async () => {
      const values = await renderFieldLayoutDialog({
        title: __('Print Settings'),
        fields: [
          {
            fieldname: 'orientation',
            fieldtype: 'Select',
            label: __('Orientation'),
            options: 'Portrait\nLandscape',
            default: 'Landscape',
          },
          { fieldname: 'include_filters', fieldtype: 'Check', label: __('Include Filters'), default: 1 },
        ],
        submitLabel: __('Print'),
      })
      if (!values) return
      const style = window.document.createElement('style')
      style.dataset.deskReportPrint = 'true'
      style.textContent = `@media print { @page { size: ${values.orientation === 'Portrait' ? 'portrait' : 'landscape'}; } }`
      window.document.head.appendChild(style)
      window.print()
      window.setTimeout(() => style.remove(), 1000)
    })()
  }

  function toggleDefault() {
    const next = !defaultReport
    setDefaultReport(next)
    window.localStorage.setItem(`desk-default-report:${report}`, String(next))
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        className="h-12"
        left={<h1 className="text-lg font-medium text-ink-gray-9">{__(report)}</h1>}
        right={
          <div className="flex items-center gap-1">
            {(facade?.innerButtons ?? [])
              .filter((button) => !button.group)
              .map((button) => (
                <Button key={button.label} variant="subtle" label={button.label} onClick={() => void button.action()} />
              ))}
            {(facade?.buttonGroups ?? []).map((group) => (
              <Dropdown
                key={group.label}
                placement="right"
                options={group.items.map((item) => ({ label: item.label, onClick: () => void item.action() }))}
              >
                {() => <Button label={group.label} variant="subtle" iconRight="lucide-chevrons-up-down" />}
              </Dropdown>
            ))}
            {data.columns && !missingFilters.length ? (
              <Dropdown
                placement="right"
                options={[
                  { label: __('Print'), icon: 'lucide-printer', onClick: printReport },
                  {
                    label: __('Export'),
                    icon: 'lucide-download',
                    onClick: () => downloadCsv(`${report.replaceAll(' ', '_')}.csv`, rows, exportColumns),
                  },
                  { label: __('Add Card'), icon: 'lucide-layout-dashboard', onClick: () => void addNumberCard() },
                  { label: __('Add Chart'), icon: 'lucide-chart-column', onClick: () => void addChart() },
                  { label: __('Save'), icon: 'lucide-save', onClick: () => void saveCustomReport() },
                  {
                    label: defaultReport ? __('Unset Default') : __('Set as Default'),
                    icon: 'lucide-star',
                    onClick: toggleDefault,
                  },
                  ...(facade?.innerButtons ?? []).map((button) => ({
                    label: button.label,
                    onClick: () => void button.action(),
                  })),
                ]}
              >
                {() => <Button label={__('Actions')} variant="subtle" iconRight="lucide-chevrons-up-down" />}
              </Dropdown>
            ) : null}
            <Button
              variant="subtle"
              icon="lucide-refresh-cw"
              aria-label={__('Reload Report')}
              loading={resource.loading}
              onClick={run}
            />
            <Dropdown
              placement="right"
              options={[
                { label: __('Pick Columns'), onClick: () => setShowColumns(true) },
                ...(definition.data?.prepared_report
                  ? [{ label: __('Prepare Report'), onClick: () => void prepareReport() }]
                  : []),
                ...(facade?.menuItems ?? []).map((item) => ({ label: item.label, onClick: () => void item.action() })),
              ]}
            >
              <Button variant="subtle" icon="lucide-more-horizontal" aria-label={__('Menu')} />
            </Dropdown>
          </div>
        }
      />
      <div className="flex flex-wrap items-start gap-x-3 gap-y-3 px-5 pb-1 pt-3">
        {orderedFilters.map((filter, index) => {
          if (filter.fieldtype === 'Break') return filtersExpanded ? <div key={`break-${index}`} className="basis-full" /> : null
          const position = nonBreakFilters.indexOf(filter)
          if (!filtersExpanded && position >= COLLAPSED_FILTERS) return null
          const isToggleRow = collapsible && position === COLLAPSED_FILTERS - 1
          return (
            <Fragment key={filter.fieldname ?? `filter-${index}`}>
              <div
                className={
                  isToggleRow
                    ? 'w-[calc((100%-60px)/6-40px)] min-w-[100px]'
                    : 'w-[calc((100%-60px)/6)] min-w-[140px]'
                }
              >
                <ReportFilterControl
                  filter={filter}
                  invalid={missingFilters.includes(filter.fieldname)}
                  value={filters[filter.fieldname] ?? ''}
                  onChange={(value) => {
                    if (facade) {
                      void facade.set_filter_value(filter.fieldname, value, false)
                      if (typeof filter.on_change === 'function') filter.on_change(facade)
                      if (filter.fieldtype !== 'Data') facade.refresh()
                    } else setFilters((current) => ({ ...current, [filter.fieldname]: value }))
                  }}
                />
              </div>
              {isToggleRow && (
                <button
                  type="button"
                  aria-label={filtersExpanded ? __('Collapse filters') : __('Expand filters')}
                  onClick={() => setFiltersExpanded((open) => !open)}
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-gray-6 hover:bg-surface-gray-2"
                >
                  <Icon icon={filtersExpanded ? 'lucide-chevron-up' : 'lucide-chevron-down'} className="size-4" />
                </button>
              )}
            </Fragment>
          )
        })}
        {preparedReportName && (
          <span className="text-xs text-ink-gray-5">{__('Prepared report: {0}', [preparedReportName])}</span>
        )}
      </div>
      {missingFilters.length ? (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-gray-5">
          {__('Please set filters')}
        </div>
      ) : resource.error ? (
        <ErrorMessage className="m-6" message={readableError(resource.error)} />
      ) : resource.loading && !data.columns ? (
        <ReportShimmer />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
          {actionError && <ErrorMessage className="mb-4" message={actionError} />}
          {summary.length > 0 && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summary.map((item, index) => {
                const scope = window as unknown as Record<string, any>
                const raw = item.value
                const text =
                  String(item.datatype ?? '') === 'Currency' && typeof scope.format_currency === 'function'
                    ? String(scope.format_currency(raw, item.currency))
                    : String(raw ?? '')
                const indicator = String(item.indicator ?? '')
                const accent = /red/i.test(indicator) ? '#dc2626' : /green/i.test(indicator) ? '#16a34a' : undefined
                return (
                  <ModernStatCard
                    key={`${String(item.label ?? index)}`}
                    item={{ label: String(item.label ?? ''), value: text, accent }}
                  />
                )
              })}
            </div>
          )}
          {chart && Array.isArray(chart.labels) && Array.isArray(chart.datasets) && chart.labels.length > 0 && (
            <div className="mb-5 overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base p-3">
              <AxisChart
                config={{
                  title: __(report),
                  data: chart.labels.map((label: unknown, index: number) => ({
                    label: String(label),
                    value: chart.datasets[0]?.values?.[index] ?? 0,
                  })),
                  xAxis: { key: 'label', type: 'category' },
                  yAxis: {},
                  series: [{ name: String(chart.datasets[0]?.name ?? __('Value')), type: 'bar' }],
                }}
              />
            </div>
          )}
          {rows.length > 0 ? (
            <>
              <ReportDataTable columns={visibleColumns} rows={rows} format={formatCell} />
              {isTree && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={level}
                    onChange={(event) => setDepth(Math.max(1, Number(event.target.value) || 1))}
                    className="h-7 w-16 rounded-sm border border-outline-gray-2 bg-surface-base px-2 text-base text-ink-gray-8 focus:ring-0"
                  />
                  <Button variant="outline" label={__('Set Level')} onClick={() => setDepth(level)} />
                  <Button
                    variant="outline"
                    label={level > 1 ? __('Collapse All') : __('Expand All')}
                    onClick={() => setDepth(level > 1 ? 1 : 99)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
              <span className="flex size-11 items-center justify-center rounded-full bg-surface-gray-2">
                <Icon icon="lucide-sheet" className="size-5 text-ink-gray-5" />
              </span>
              <div className="text-base font-medium text-ink-gray-8">{__('Nothing to show')}</div>
            </div>
          )}
        </div>
      )}
      {data.columns && !missingFilters.length ? (
        <div className="flex items-center justify-between gap-4 border-t border-outline-gray-2 px-5 py-2 text-[13px] text-ink-gray-5">
          <span>{__('For comparison, use >5, <10 or =324. For ranges, use 5:10 (for values between 5 & 10).')}</span>
          <span>{__('Execution Time: {0} sec', [String(data.execution_time ?? 0)])}</span>
        </div>
      ) : null}
      <Dialog
        open={showColumns}
        onOpenChange={setShowColumns}
        title={__('Report Columns')}
        actions={[{ label: __('Apply'), variant: 'solid', onClick: ({ close }) => close() }]}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {columns.map((column) => (
            <FormControl
              key={column.fieldname}
              type="checkbox"
              label={__(column.label ?? column.fieldname)}
              value={(visibleColumnNames ?? columns.map((entry) => entry.fieldname)).includes(column.fieldname)}
              onChange={(checked: boolean) => {
                const selected = visibleColumnNames ?? columns.map((entry) => entry.fieldname)
                const next = checked
                  ? [...selected, column.fieldname]
                  : selected.filter((fieldname) => fieldname !== column.fieldname)
                setVisibleColumnNames(next.length ? next : [column.fieldname])
              }}
            />
          ))}
        </div>
      </Dialog>
    </main>
  )
}
