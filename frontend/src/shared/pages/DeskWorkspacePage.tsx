import { useEffect, useMemo, useRef, useState } from 'react'
import { frappe } from '@/shared/frappe'
import { Icon } from '../components/Icon'
import { ModuleIcon } from '../components/ModuleIcon'
import { useNavigate } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { rpc } from '@/core/api/rpc'
import { useListResource, useResource } from '@/core/resources'
import { AxisChart, Button, Dropdown, ErrorMessage, Spinner, usePageMeta } from '@/design-system'
import { LayoutHeader } from '../components/LayoutHeader'
import { timeAgo } from '../utils/date'
import { downloadCsv } from '../utils/csv'
import { toReportviewFilters, type ListFilter } from '../utils/listFilters'
import type { ReportFilterDef } from '../frappe/queryReport'
import { ChartFilterButton } from '../components/ChartFilterButton'
import { useDeskShell } from '../hooks/useDeskShell'
import { useMeta } from '../hooks/useMeta'
import { useUsers } from '../hooks/useUsers'
import { currentSessionUser } from '../stores/usersStore'
import { shellLanding } from '../utils/deskShell'
import { sanitizeHTML } from '../utils/text'
import {
  parseWorkspaceBlocks,
  unwrapDeskResponse,
  workspaceItems,
  workspaceName,
  workspacePages,
  type DeskWorkspace,
} from '../utils/deskWorkspace'

interface DeskWorkspacePageProps {
  page?: DeskWorkspace | null
}

type AnyRecord = Record<string, any>

frappe.provide('frappe.dashboards.chart_sources')

function routeFor(link: DeskWorkspace): string {
  const target = String(link.link_to ?? link.name ?? '')
  const type = String(link.link_type ?? link.type ?? '')
  const encoded = encodeURIComponent(target)
  if (type === 'URL') return String(link.url ?? '')
  if (type === 'Dashboard') return `/app/dashboard-view/${encoded}`
  if (type === 'Report' || Boolean(link.is_query_report)) {
    return link.report_ref_doctype && !link.is_query_report
      ? `/app/${encodeURIComponent(String(link.report_ref_doctype))}/view/report/${encoded}`
      : `/app/query-report/${encoded}`
  }
  return `/app/${encoded}`
}

function WorkspaceShortcut({ item }: { item: DeskWorkspace }) {
  const navigate = useNavigate()
  if (!item.link_to && !item.name) return null
  const count = item.stats_filter ? null : null
  return (
    <button
      type="button"
      className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-outline-gray-2 bg-surface-base px-3 text-left hover:bg-surface-gray-1"
      onClick={() =>
        String(item.link_type) === 'URL'
          ? window.open(String(item.url), '_blank', 'noreferrer')
          : navigate(routeFor(item))
      }
    >
      <span className="truncate text-base text-ink-gray-9">{__(String(item.label ?? item.link_to))}</span>
      <span className="flex items-center gap-1.5 text-ink-gray-5">
        {count}
        <span className="lucide-arrow-up-right size-3.5" aria-hidden="true" />
      </span>
    </button>
  )
}

function WorkspaceLinkGroup({ group }: { group: DeskWorkspace }) {
  const navigate = useNavigate()
  const links = (Array.isArray(group.links) ? group.links : []) as DeskWorkspace[]
  return (
    <section className="px-2 py-1">
      <h3 className="mb-2 text-sm-medium text-ink-gray-9">{__(String(group.label ?? __('Links')))}</h3>
      <div className="flex flex-col gap-1.5">
        {links
          .filter((link) => !link.hidden)
          .map((link) => (
            <button
              key={`${String(link.link_to)}:${String(link.label ?? '')}`}
              type="button"
              className="truncate text-left text-sm text-ink-gray-6 hover:text-ink-gray-9 hover:underline"
              onClick={() =>
                String(link.link_type) === 'URL'
                  ? window.open(String(link.url), '_blank', 'noreferrer')
                  : navigate(routeFor(link))
              }
            >
              {__(String(link.label ?? link.link_to))}
            </button>
          ))}
      </div>
    </section>
  )
}

export function WorkspaceNumberCard({ item }: { item: DeskWorkspace }) {
  const card = useResource<AnyRecord>({
    url: 'frappe.client.get',
    params: { doctype: 'Number Card', name: item.number_card_name },
    cache: ['desk-number-card', item.number_card_name],
    auto: Boolean(item.number_card_name),
    initialData: null,
    transform: (value) => {
      const payload = unwrapDeskResponse(value)
      return payload && typeof payload === 'object' ? (payload as AnyRecord) : null
    },
  })
  const result = useResource<number>({
    url: 'frappe.desk.doctype.number_card.number_card.get_result',
    params: { doc: card.data ?? {}, filters: {} },
    cache: ['desk-number-card-result', item.number_card_name],
    auto: Boolean(card.data?.name),
    initialData: 0,
    transform: (value) => Number(unwrapDeskResponse(value) ?? 0),
  })
  const scope = window as unknown as Record<string, any>
  const isCount = String(card.data?.function ?? '') === 'Count'
  const display =
    !isCount && typeof scope.format_currency === 'function'
      ? String(scope.format_currency(result.data ?? 0))
      : String(result.data ?? 0)
  return (
    <div className="rounded-xl border border-outline-gray-2 bg-surface-base px-4 py-3">
      <div className="text-[13px] text-ink-gray-6">{String(item.label ?? item.number_card_name ?? '')}</div>
      <div className="mt-2 text-xl font-semibold text-ink-gray-9">
        {result.loading && !result.fetched ? <Spinner size="sm" /> : display}
      </div>
    </div>
  )
}

function parseJsonObject(value: string): AnyRecord {
  try {
    return JSON.parse(value) as AnyRecord
  } catch {
    return {}
  }
}

const TIMESPANS = ['Last Year', 'Last Quarter', 'Last Month', 'Last Week']
const TIME_INTERVALS = ['Yearly', 'Quarterly', 'Monthly', 'Weekly', 'Daily']

function ChartEmptySample() {
  return (
    <svg
      viewBox="0 0 800 240"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full blur-[3px]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chart-empty-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#077ddf" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#077ddf" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 110 205 C 160 180 200 160 250 165 S 330 190 390 165 S 450 120 520 125 S 600 150 680 130 S 700 100 710 90 L 710 215 L 110 215 Z"
        fill="url(#chart-empty-fill)"
      />
      <path
        d="M 110 205 C 160 180 200 160 250 165 S 330 190 390 165 S 450 120 520 125 S 600 150 680 130 S 700 100 710 90"
        fill="none"
        stroke="#077ddf"
        strokeOpacity="0.25"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChartControl({
  icon,
  label,
  options,
  onSelect,
}: {
  icon?: string
  label: string
  options: string[]
  onSelect: (value: string) => void
}) {
  return (
    <Dropdown
      placement="right"
      options={options.map((option) => ({ label: __(option), onClick: () => onSelect(option) }))}
    >
      {() => (
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-lg bg-surface-gray-2 px-2 text-sm text-ink-gray-8 hover:bg-surface-gray-3"
        >
          {icon ? <Icon icon={icon} className="size-4" /> : null}
          <span>{__(label)}</span>
          <Icon icon="lucide-chevrons-up-down" className="size-3.5 text-ink-gray-6" />
        </button>
      )}
    </Dropdown>
  )
}

export function WorkspaceChart({ item }: { item: DeskWorkspace }) {
  const navigate = useNavigate()
  const doc = useResource<AnyRecord | null>({
    url: 'frappe.client.get',
    params: { doctype: 'Dashboard Chart', name: item.chart_name },
    cache: ['desk-chart-doc', item.chart_name],
    auto: Boolean(item.chart_name),
    initialData: null,
    transform: (value) => {
      const payload = unwrapDeskResponse(value)
      return payload && typeof payload === 'object' ? (payload as AnyRecord) : null
    },
  })
  const definition = doc.data
  const isReport = definition?.chart_type === 'Report'
  const filtersJson = String(definition?.filters_json ?? '{}')
  const filters = useMemo(() => parseJsonObject(filtersJson), [filtersJson])
  const [saved, setSaved] = useState<AnyRecord | null>(null)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const settings = (await frappe.dashboard_utils.get_dashboard_settings()) as AnyRecord | undefined
      const config = parseJsonObject(String(settings?.chart_config ?? '{}'))
      if (!cancelled) setSaved((config[String(item.chart_name)] as AnyRecord | undefined) ?? {})
    })().catch(() => {
      if (!cancelled) setSaved({})
    })
    return () => {
      cancelled = true
    }
  }, [item.chart_name])
  const [timespanChoice, setTimespan] = useState<string | null>(null)
  const [intervalChoice, setInterval] = useState<string | null>(null)
  const [documentFilters, setDocumentFilters] = useState<ListFilter[] | null>(null)
  const [valueFilters, setValueFilters] = useState<AnyRecord | null>(null)
  const timespan = timespanChoice ?? (saved?.timespan as string | undefined) ?? null
  const interval = intervalChoice ?? (saved?.time_interval as string | undefined) ?? null
  const activeDocumentFilters: ListFilter[] =
    documentFilters ??
    (Array.isArray(saved?.filters)
      ? (saved.filters as unknown[][]).map((entry) => ({
          field: String(entry[1]),
          op: String(entry[2]),
          value: Array.isArray(entry[3]) ? entry[3].join(',') : String(entry[3] ?? ''),
        }))
      : [])
  const activeValueFilters: AnyRecord = useMemo(
    () => valueFilters ?? (saved?.filters && !Array.isArray(saved.filters) ? (saved.filters as AnyRecord) : {}),
    [valueFilters, saved],
  )
  function persist(config: AnyRecord | null, reset = 0) {
    void frappe
      .xcall('frappe.desk.doctype.dashboard_settings.dashboard_settings.save_chart_config', {
        reset,
        config: config ?? {},
        chart_name: item.chart_name,
      })
      .catch(() => undefined)
  }
  function chooseTimespan(value: string) {
    setTimespan(value)
    persist({ timespan: value })
  }
  function chooseInterval(value: string) {
    setInterval(value)
    persist({ time_interval: value })
  }
  function applyDocumentFilters(next: ListFilter[]) {
    setDocumentFilters(next)
    persist({ filters: toReportviewFilters(String(definition?.document_type ?? ''), next) })
  }
  function applyValueFilters(next: AnyRecord) {
    setValueFilters(next)
    persist({ filters: next })
  }
  function resetChart() {
    setTimespan(null)
    setInterval(null)
    setDocumentFilters([])
    setValueFilters({})
    setSaved({})
    persist(null, 1)
  }
  const activeTimespan = timespan ?? String(definition?.timespan ?? 'Last Year')
  const activeInterval = interval ?? String(definition?.time_interval ?? 'Monthly')
  const timeseries = Boolean(definition?.timeseries) && !isReport
  const isCustom = definition?.chart_type === 'Custom'
  const [sourceSettings, setSourceSettings] = useState<AnyRecord | null>(null)
  const source = isCustom ? String(definition?.source ?? '') : ''
  useEffect(() => {
    if (!source) return undefined
    let cancelled = false
    const sources = (frappe.dashboards as AnyRecord).chart_sources as AnyRecord
    void (async () => {
      if (!sources[source]) {
        const config = await frappe.xcall(
          'frappe.desk.doctype.dashboard_chart_source.dashboard_chart_source.get_config',
          {
            name: source,
          },
        )
        frappe.dom.eval(config)
      }
      if (!cancelled) setSourceSettings((sources[source] as AnyRecord | undefined) ?? null)
    })().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [source])
  const customFilters = useMemo(() => {
    const base: AnyRecord = {}
    for (const entry of (sourceSettings?.filters ?? []) as AnyRecord[])
      if (entry.default !== undefined && entry.default !== null) base[String(entry.fieldname)] = entry.default
    return { ...base, ...filters, ...activeValueFilters }
  }, [sourceSettings, filters, activeValueFilters])
  const chartUrl = isReport
    ? 'frappe.desk.query_report.run'
    : isCustom
      ? String(sourceSettings?.method ?? '')
      : 'frappe.desk.doctype.dashboard_chart.dashboard_chart.get'
  const chart = useResource<AnyRecord | null>({
    url: chartUrl,
    params: isReport
      ? { report_name: definition?.report_name, filters: { ...filters, ...activeValueFilters } }
      : {
          chart_name: item.chart_name,
          refresh: 1,
          ...(isCustom
            ? { filters: JSON.stringify(customFilters) }
            : activeDocumentFilters.length
              ? {
                  filters: JSON.stringify(
                    toReportviewFilters(String(definition?.document_type ?? ''), activeDocumentFilters),
                  ),
                }
              : {}),
          ...(timeseries ? { timespan: activeTimespan, time_interval: activeInterval } : {}),
        },
    cache: [
      'desk-chart',
      item.chart_name,
      chartUrl,
      activeTimespan,
      activeInterval,
      JSON.stringify(activeDocumentFilters),
      JSON.stringify(activeValueFilters),
    ],
    auto: Boolean(definition) && Boolean(chartUrl) && saved !== null,
    initialData: null,
    transform: (value) => {
      const payload = unwrapDeskResponse(value)
      if (!payload || typeof payload !== 'object') return null
      return isReport ? ((payload as AnyRecord).chart ?? null) : (payload as AnyRecord)
    },
  })
  const data = chart.data
  const wasLoading = useRef(false)
  useEffect(() => {
    if (wasLoading.current && !chart.loading) void doc.reload().catch(() => undefined)
    wasLoading.current = chart.loading
  }, [chart.loading, doc])
  const labels = Array.isArray(data?.labels) ? data.labels : Array.isArray(data?.data?.labels) ? data.data.labels : []
  const datasets = Array.isArray(data?.datasets)
    ? data.datasets
    : Array.isArray(data?.data?.datasets)
      ? data.data.datasets
      : []
  const chartData = labels.map((label: unknown, index: number) => ({
    label: String(label),
    value: datasets[0]?.values?.[index] ?? 0,
  }))
  const hasValues = chartData.some((point: { value: unknown }) => Number(point.value) !== 0)
  const title = String(item.label ?? item.chart_name ?? '')
  const synced = definition?.last_synced_on ? timeAgo(String(definition.last_synced_on)) : ''
  const listTarget = isReport
    ? {
        label: __('{0} Report', [String(definition?.report_name ?? '')]),
        path: `/app/query-report/${encodeURIComponent(String(definition?.report_name ?? ''))}`,
      }
    : definition?.document_type
      ? {
          label: __('{0} List', [__(String(definition.document_type))]),
          path: `/app/${encodeURIComponent(String(definition.document_type))}`,
        }
      : null
  const editPath = `/app/dashboard-chart/${encodeURIComponent(String(item.chart_name))}`
  const menu = [
    { label: __('Refresh'), onClick: () => void chart.reload() },
    { label: __('Edit'), onClick: () => navigate(editPath) },
    { label: __('Reset Chart'), onClick: resetChart },
    {
      label: __('Export'),
      onClick: () =>
        downloadCsv(
          `${String(item.chart_name).replaceAll(' ', '_')}.csv`,
          labels.map((label: unknown, index: number) => ({
            label: String(label),
            ...Object.fromEntries(
              (datasets as AnyRecord[]).map((set, position) => [
                String(set.name ?? `value_${position + 1}`),
                set.values?.[index] ?? 0,
              ]),
            ),
          })),
          [
            { key: 'label', label: __('Label') },
            ...(datasets as AnyRecord[]).map((set, position) => ({
              key: String(set.name ?? `value_${position + 1}`),
              label: String(set.name ?? `value_${position + 1}`),
            })),
          ],
        ),
    },
    ...(listTarget ? [{ label: listTarget.label, onClick: () => navigate(listTarget.path) }] : []),
  ]
  const chartType = String(definition?.type ?? 'Line')
  const emptyIcon =
    chartType === 'Bar'
      ? 'lucide-chart-column'
      : ['Pie', 'Donut', 'Percentage'].includes(chartType)
        ? 'lucide-chart-pie'
        : 'lucide-chart-line'
  const loading = (doc.loading || chart.loading) && !data
  return (
    <section className="rounded-xl border border-outline-gray-2 bg-surface-base px-5 pb-5 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-ink-gray-9">{__(title)}</h3>
          {synced ? <p className="mt-1 text-[13px] text-ink-gray-6">{__('Last synced {0}', [synced])}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ChartFilterButton
            definition={definition}
            chartLabel={title}
            sourceFilters={sourceSettings?.filters as ReportFilterDef[] | undefined}
            documentFilters={activeDocumentFilters}
            valueFilters={activeValueFilters}
            onApplyDocument={applyDocumentFilters}
            onApplyValues={applyValueFilters}
          />
          {timeseries ? (
            <>
              <ChartControl label={activeTimespan} options={TIMESPANS} onSelect={chooseTimespan} />
              <ChartControl
                icon="lucide-calendar"
                label={activeInterval}
                options={TIME_INTERVALS}
                onSelect={chooseInterval}
              />
            </>
          ) : null}
          <Dropdown placement="right" options={menu}>
            {() => (
              <button
                type="button"
                aria-label={__('Menu')}
                className="flex size-7 items-center justify-center rounded-lg bg-surface-gray-2 hover:bg-surface-gray-3"
              >
                <Icon icon="lucide-ellipsis" className="size-4" />
              </button>
            )}
          </Dropdown>
        </div>
      </div>
      <div className="mt-2">
        {loading ? (
          <div className="flex h-60 items-center justify-center text-sm text-ink-gray-5">{__('Loading...')}</div>
        ) : chartData.length && hasValues ? (
          <AxisChart
            config={{
              title: '',
              data: chartData,
              xAxis: { key: 'label', type: 'category' },
              yAxis: {},
              series: [{ name: String(datasets[0]?.name ?? __('Value')), type: 'bar' }],
            }}
          />
        ) : (
          <div className="relative flex h-60 flex-col items-center justify-center gap-3 text-center">
            <ChartEmptySample />
            <span className="relative flex size-11 items-center justify-center rounded-full bg-surface-gray-2 text-ink-gray-5">
              <Icon icon={emptyIcon} className="size-5" />
            </span>
            <p className="relative max-w-xs text-sm text-ink-gray-5">{__('No data yet')}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function parseQuickListFilter(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function WorkspaceQuickList({ item }: { item: DeskWorkspace }) {
  const navigate = useNavigate()
  const doctype = String(item.document_type ?? '')
  const resource = useListResource({
    doctype: doctype || 'DocType',
    fields: ['name'],
    filters: parseQuickListFilter(item.quick_list_filter),
    orderBy: 'modified desc',
    pageLength: 5,
    auto: Boolean(doctype),
  })
  const rows = (resource.data ?? []) as DeskWorkspace[]
  return (
    <section className="rounded-xl border border-outline-gray-2 bg-surface-base p-4">
      <h2 className="mb-3 text-sm-medium text-ink-gray-9">{__(String(item.label ?? doctype))}</h2>
      {resource.list.error ? (
        <ErrorMessage message={resource.list.error} />
      ) : resource.list.loading && !rows.length ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : rows.length ? (
        <div className="flex flex-col gap-1">
          {rows.map((row) => (
            <button
              key={String(row.name)}
              type="button"
              className="rounded-lg px-2 py-1.5 text-left text-sm text-ink-blue-6 hover:bg-surface-gray-1"
              onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(String(row.name))}`)}
            >
              {String(row.name)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-gray-6">{__('No records')}</p>
      )}
    </section>
  )
}

function WorkspaceCustomBlock({ item }: { item: DeskWorkspace }) {
  const block = useResource<AnyRecord>({
    url: 'frappe.client.get',
    params: { doctype: 'Custom HTML Block', name: item.custom_block_name },
    cache: ['desk-custom-block', item.custom_block_name],
    auto: Boolean(item.custom_block_name),
    initialData: null,
    transform: (value) => {
      const payload = unwrapDeskResponse(value)
      return payload && typeof payload === 'object' ? (payload as AnyRecord) : null
    },
  })
  return (
    <section className="rounded-xl border border-outline-gray-2 bg-surface-base p-4">
      <h2 className="mb-3 text-sm-medium text-ink-gray-9">{__(String(item.label ?? item.custom_block_name ?? ''))}</h2>
      {block.error ? (
        <ErrorMessage message={block.error} />
      ) : block.loading && !block.data ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <div
          className="prose prose-sm max-w-none text-ink-gray-7"
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(block.data?.html ?? '') }}
        />
      )}
    </section>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return __('Good morning')
  if (hour < 17) return __('Good afternoon')
  return __('Good evening')
}

function OnboardingStepActions({
  step,
  complete,
  onOpen,
  onSkip,
}: {
  step: DeskWorkspace
  complete: boolean
  onOpen: () => void
  onSkip: () => void
}) {
  const navigate = useNavigate()
  const reference = String(step.reference_document ?? '')
  const meta = useMeta(step.action === 'Create Entry' && reference ? reference : '')
  const canImport = step.action === 'Create Entry' && Boolean(reference) && Boolean(meta.doctypeMeta?.allow_import)
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="solid"
        label={String(step.action_label ?? step.title)}
        iconRight="lucide-arrow-right"
        onClick={onOpen}
      />
      {canImport ? (
        <Button
          variant="subtle"
          iconLeft="lucide-download"
          label={__('Import')}
          onClick={() => navigate(`/app/data-import/doctype/${encodeURIComponent(reference)}`)}
        />
      ) : null}
      {!complete && <Button variant="subtle" label={__('Skip')} onClick={onSkip} />}
    </div>
  )
}

function WorkspaceOnboarding({ item }: { item: DeskWorkspace }) {
  const [actionError, setActionError] = useState<string | null>(null)
  const shell = useDeskShell()
  const { getUser } = useUsers()
  const onboardingName = String(item.onboarding_name ?? '')
  const onboarding = useResource<DeskWorkspace[]>({
    url: 'frappe.desk.desktop.get_onboarding_data',
    params: { module: onboardingName },
    cache: ['desk-onboarding', onboardingName],
    auto: Boolean(onboardingName),
    initialData: [],
    transform: (value) => {
      const payload = unwrapDeskResponse(value)
      return Array.isArray(payload)
        ? payload.filter((entry): entry is DeskWorkspace => Boolean(entry && typeof entry === 'object'))
        : []
    },
  })
  const data = onboarding.data?.[0]
  const steps = Array.isArray(data?.items) ? (data.items as DeskWorkspace[]) : []
  async function updateStep(step: DeskWorkspace, field: 'is_complete' | 'is_skipped') {
    if (!step.name) return
    setActionError(null)
    try {
      await rpc({
        url: 'frappe.desk.desktop.update_onboarding_step',
        method: 'POST',
        params: { name: step.name, field, value: 1 },
      })
      await onboarding.reload()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : __('Unable to update onboarding step'))
    }
  }
  const [dismissed, setDismissed] = useState(false)
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const navigate = useNavigate()
  if (onboarding.loading && !data)
    return (
      <div className="flex justify-center rounded-xl bg-surface-gray-1 py-8">
        <Spinner size="sm" />
      </div>
    )
  if (onboarding.error || !data || !steps.length || dismissed) return null
  const current =
    steps.find((step) => String(step.name) === activeStep) ??
    steps.find((step) => !step.is_complete && !step.is_skipped) ??
    steps[0]!
  function openStep(step: DeskWorkspace) {
    const path = String(step.path ?? '')
    const action = String(step.action ?? '')
    const video = String(step.intro_video_url ?? step.video_url ?? '')
    if (action === 'Watch Video' && video) setPlaying(String(step.name))
    else if (action === 'Complete Onboarding' && step.module_onboarding) {
      const target = Object.values(shell.sidebars).find(
        (sidebar) => sidebar.module_onboarding === step.module_onboarding,
      )
      const landing = target ? shellLanding(shell, target.name) : undefined
      if (landing) navigate(landing)
    } else if (action === 'Go to Page' && path)
      navigate(
        path.startsWith('Tree/')
          ? `/app/${encodeURIComponent(path.slice(5))}/view/tree`
          : `/app/${path.split('/').map(encodeURIComponent).join('/')}`,
      )
    else if (action === 'Create Entry' && step.reference_document)
      navigate(`/app/${encodeURIComponent(String(step.reference_document))}/new`)
    else if (action === 'Show Form Tour' && step.reference_document)
      navigate(`/app/${encodeURIComponent(String(step.reference_document))}`)
    else if (action === 'View Report' && step.reference_report)
      navigate(`/app/query-report/${encodeURIComponent(String(step.reference_report))}`)
    else if (action === 'Update Settings' && step.reference_document)
      navigate(`/app/${encodeURIComponent(String(step.reference_document))}`)
  }
  const required = steps.filter((step) => !step.is_optional)
  const requiredDone = required.filter((step) => step.is_complete || step.is_skipped).length
  const umbrella = steps.some((step) => step.action === 'Complete Onboarding')
  const moduleLabel = (step: DeskWorkspace) =>
    Object.values(shell.sidebars).find((sidebar) => sidebar.module_onboarding === step.module_onboarding)?.label ?? ''
  const moduleIcon = (step: DeskWorkspace) =>
    Object.values(shell.sidebars).find((sidebar) => sidebar.module_onboarding === step.module_onboarding)?.header_icon
  const progress = __('{0} of {1} steps done', [String(requiredDone), String(required.length)])
  const videoId = (step: DeskWorkspace) => {
    const match = /(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/.exec(String(step.intro_video_url ?? step.video_url ?? ''))
    return match?.[1]
  }
  const user = currentSessionUser()
  const firstName = String(getUser(user ?? '').full_name ?? '').split(' ')[0]
  return (
    <section className="rounded-xl bg-surface-gray-1 px-3 pb-3 pt-4">
      <div className="flex items-start justify-between gap-3 px-2">
        <div>
          <h2 className="text-lg font-medium leading-[21px] text-ink-gray-9">
            {umbrella ? `${greeting()}, ${firstName}` : __(String(data.title ?? item.label ?? onboardingName))}
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-ink-gray-5">
            {umbrella ? `${__(String(data.title ?? ''))} · ${progress}` : progress}
          </p>
        </div>
        <Button variant="ghost" label={__('Dismiss')} onClick={() => setDismissed(true)} />
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex gap-1 px-2" aria-hidden="true">
          {required.map((step) => (
            <span
              key={String(step.name)}
              className={`h-1 flex-1 rounded-full ${step.is_complete || step.is_skipped ? 'bg-ink-gray-9' : 'bg-surface-gray-3'}`}
            />
          ))}
        </div>
        <ErrorMessage className="mx-2" message={actionError} />
        <div className="flex flex-col gap-0.5">
          {steps.map((step) => {
            const complete = Boolean(step.is_complete || step.is_skipped)
            const open = step === current
            const video = open ? videoId(step) : undefined
            const label = step.action === 'Complete Onboarding' ? moduleLabel(step) : ''
            return (
              <div
                key={String(step.name)}
                className={`flex gap-5 rounded-md px-2 ${open ? 'bg-surface-white py-[10px] pt-3' : 'py-2'}`}
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    aria-expanded={open}
                    className="flex w-full items-center gap-2 text-left"
                    onClick={() => setActiveStep(String(step.name))}
                  >
                    {label && !open ? (
                      <ModuleIcon name={moduleIcon(step)} className="size-4 shrink-0" />
                    ) : (
                      <span
                        className={`size-4 shrink-0 rounded-full border ${complete ? 'border-ink-gray-8 bg-ink-gray-8' : open ? 'border-ink-gray-8' : 'border-ink-gray-4'}`}
                        aria-hidden="true"
                      />
                    )}
                    {label && !open ? <span className="shrink-0 text-base text-ink-gray-8">{__(label)}</span> : null}
                    <span
                      className={`truncate text-base ${open ? 'font-medium text-ink-gray-9' : complete ? 'text-ink-gray-5 line-through' : 'text-ink-gray-5'}`}
                    >
                      {String(step.title ?? step.name)}
                    </span>
                    {step.is_optional ? (
                      <span className="rounded bg-surface-gray-2 px-1.5 text-xs text-ink-gray-6">{__('Optional')}</span>
                    ) : null}
                  </button>
                  {open && (
                    <div className="mt-2 flex flex-col gap-3 pl-6">
                      <p
                        className="text-[13px] leading-5 text-ink-gray-6 [&_a]:underline"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHTML(
                            String(step.description ?? '').replace(
                              /\[([^\]]+)\]\(([^)]+)\)/g,
                              '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
                            ),
                          ),
                        }}
                      />
                      <OnboardingStepActions
                        step={step}
                        complete={complete}
                        onOpen={() => openStep(step)}
                        onSkip={() => void updateStep(step, 'is_skipped')}
                      />
                    </div>
                  )}
                </div>
                {video && (
                  <div className="relative h-[180px] w-[320px] shrink-0 overflow-hidden rounded-[10px] bg-surface-gray-3">
                    {playing === String(step.name) ? (
                      <iframe
                        title={String(step.title ?? step.name)}
                        src={`https://www.youtube.com/embed/${video}?autoplay=1&rel=0`}
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        className="size-full border-0"
                      />
                    ) : (
                      <button
                        type="button"
                        aria-label={__('Play video')}
                        className="relative size-full"
                        onClick={() => setPlaying(String(step.name))}
                      >
                        <img
                          alt=""
                          src={`https://i.ytimg.com/vi/${video}/maxresdefault.jpg`}
                          className="size-full object-cover"
                        />
                        <span className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white">
                          <Icon icon="lucide-play" className="size-4 fill-white" />
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const COL_SPAN: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12',
}

function renderWorkspaceBlock(block: DeskWorkspace, data: AnyRecord, index: number) {
  const type = String(block.type ?? '')
  const item = block.data ?? {}
  if (type === 'header')
    return (
      <h2
        key={`${type}:${index}`}
        className="text-lg-semibold text-ink-gray-6"
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(String(item.text ?? item.label ?? '')) }}
      />
    )
  if (type === 'paragraph')
    return (
      <p
        key={`${type}:${index}`}
        className="text-sm text-ink-gray-7"
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(String(item.text ?? '')) }}
      />
    )
  if (type === 'spacer') return <div key={`${type}:${index}`} className="h-4" aria-hidden="true" />
  if (type === 'shortcut') {
    const shortcut = workspaceItems(data.shortcuts).find(
      (entry) => String(entry.label ?? entry.link_to) === String(item.shortcut_name),
    )
    return shortcut ? <WorkspaceShortcut key={`${type}:${index}`} item={shortcut} /> : null
  }
  if (type === 'card') {
    const group = workspaceItems(data.cards).find((entry) => String(entry.label) === String(item.card_name))
    return group ? <WorkspaceLinkGroup key={`${type}:${index}`} group={group} /> : null
  }
  if (type === 'number_card') {
    const numberCard = workspaceItems(data.number_cards).find(
      (entry) => String(entry.number_card_name) === String(item.number_card_name),
    )
    return numberCard ? <WorkspaceNumberCard key={`${type}:${index}`} item={numberCard} /> : null
  }
  if (type === 'chart') {
    const chart = workspaceItems(data.charts).find((entry) => String(entry.chart_name) === String(item.chart_name))
    return chart ? <WorkspaceChart key={`${type}:${index}`} item={chart} /> : null
  }
  if (type === 'quick_list') {
    const quickList = workspaceItems(data.quick_lists).find(
      (entry) => String(entry.document_type) === String(item.quick_list_name),
    )
    return quickList ? <WorkspaceQuickList key={`${type}:${index}`} item={quickList} /> : null
  }
  if (type === 'custom_block') {
    const customBlock = workspaceItems(data.custom_blocks).find(
      (entry) => String(entry.custom_block_name) === String(item.custom_block_name),
    )
    return customBlock ? <WorkspaceCustomBlock key={`${type}:${index}`} item={customBlock} /> : null
  }
  if (type === 'onboarding') return <WorkspaceOnboarding key={`${type}:${index}`} item={item} />
  return null
}

export default function DeskWorkspacePage({ page }: DeskWorkspacePageProps) {
  const navigate = useNavigate()
  const workspaces = useResource<DeskWorkspace[]>({
    url: 'frappe.desk.desktop.get_workspaces',
    params: {},
    cache: ['desk-workspaces'],
    auto: !page,
    initialData: [],
    transform: workspacePages,
  })
  const activePage = page ?? workspaces.data?.[0] ?? null
  const desktop = useResource<AnyRecord>({
    url: 'frappe.desk.desktop.get_desktop_page',
    params: { page: activePage ? JSON.stringify(activePage) : '' },
    cache: ['desk-desktop-page', workspaceName(activePage ?? {})],
    auto: Boolean(activePage),
    initialData: {},
    transform: (value) => {
      const payload = unwrapDeskResponse(value)
      return payload && typeof payload === 'object' ? (payload as AnyRecord) : {}
    },
  })
  useEffect(() => {
    if (!activePage || !desktop.hasStarted) return
    desktop.update({ params: { page: JSON.stringify(activePage) }, auto: true })
    void desktop.reload().catch(() => undefined)
  }, [activePage, desktop])
  const blocks = useMemo(() => parseWorkspaceBlocks(activePage?.content), [activePage?.content])
  const content = desktop.data ?? {}
  const fallbackShortcuts = workspaceItems(content.shortcuts)
  const fallbackCards = workspaceItems(content.cards)
  const title = activePage ? String(activePage.label ?? activePage.title ?? workspaceName(activePage)) : __('Workspace')
  usePageMeta({ title })

  if (workspaces.loading && !activePage)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  if (workspaces.error && !activePage)
    return <ErrorMessage className="m-6" message={String(workspaces.error.message ?? workspaces.error)} />
  if (!activePage)
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-gray-6">
        {__('No workspaces available')}
      </div>
    )

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        className="h-12"
        left={<h1 className="text-lg font-medium text-ink-gray-9">{__(title)}</h1>}
        right={
          <Dropdown
            placement="right"
            options={[
              {
                label: __('Edit'),
                icon: 'lucide-pencil',
                onClick: () => navigate(`/app/workspace/${encodeURIComponent(workspaceName(activePage))}`),
              },
              { label: __('New'), icon: 'lucide-plus', onClick: () => navigate('/app/workspace/new') },
              { label: __('Manage'), icon: 'lucide-settings', onClick: () => navigate('/app/workspace') },
            ]}
          >
            {() => <Button variant="subtle" icon="lucide-ellipsis" aria-label={__('Menu')} />}
          </Dropdown>
        }
      />
      <div className="mx-auto w-full max-w-[870px] flex-1 overflow-y-auto py-[17px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {desktop.error && <ErrorMessage className="mb-4" message={String(desktop.error.message ?? desktop.error)} />}
        {blocks.length ? (
          <div className="grid grid-cols-1 gap-[14px] md:grid-cols-12">
            {blocks.map((block, index) => (
              <div
                key={`${String(block.id ?? block.type)}:${index}`}
                className={COL_SPAN[Number(block.data?.col) || 12] ?? 'md:col-span-12'}
              >
                {renderWorkspaceBlock(block, content, index)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {fallbackShortcuts.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {fallbackShortcuts.map((item) => (
                  <WorkspaceShortcut key={String(item.name ?? item.label)} item={item} />
                ))}
              </div>
            )}
            {fallbackCards.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fallbackCards.map((group) => (
                  <WorkspaceLinkGroup key={String(group.label)} group={group} />
                ))}
              </div>
            )}
            {!fallbackShortcuts.length && !fallbackCards.length && (
              <p className="text-sm text-ink-gray-6">{__('This workspace has no visible items.')}</p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
