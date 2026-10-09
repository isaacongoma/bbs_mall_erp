import { frappe } from './runtime'
import { loadDeskBoot } from './boot'
import { ensureReportScripts } from './scriptLoader'

type AnyRecord = Record<string, any>
type Listener = () => void

export interface ReportFilterDef {
  fieldname: string
  label?: string
  fieldtype?: string
  options?: string
  default?: unknown
  reqd?: number
  hidden?: number
  get_query?: () => AnyRecord | undefined
  on_change?: (report: ReportFacade) => unknown
  depends_on?: string
  description?: string
  [key: string]: unknown
}

export function getReportSettings(report: string): AnyRecord {
  return (frappe.query_reports?.[report] as AnyRecord | undefined) ?? {}
}

export async function loadReportSettings(report: string): Promise<AnyRecord> {
  await loadDeskBoot()
  await ensureReportScripts(report)
  return getReportSettings(report)
}

export function resolveDefault(filter: ReportFilterDef): unknown {
  const value = typeof filter.default === 'function' ? (filter.default as () => unknown)() : filter.default
  return Array.isArray(value) ? value[0] : value
}

export class ReportFacade {
  report_name: string
  settings: AnyRecord
  filterDefs: ReportFilterDef[]
  values: AnyRecord = {}
  hiddenFilters = new Set<string>()
  columns: AnyRecord[] = []
  data: AnyRecord[] = []
  innerButtons: Array<{ label: string; action: () => unknown; group?: string }> = []
  menuItems: Array<{ label: string; action: () => unknown }> = []
  buttonGroups: Array<{ label: string; items: Array<{ label: string; action: () => unknown }> }> = []
  page: AnyRecord
  datatable: AnyRecord = {}
  private listeners = new Set<Listener>()
  private version = 0
  private runner: () => void = () => undefined

  constructor(report: string, settings: AnyRecord, filterDefs: ReportFilterDef[]) {
    this.report_name = report
    this.settings = settings
    this.filterDefs = filterDefs
    for (const filter of filterDefs) {
      const value = resolveDefault(filter)
      if (value !== undefined && value !== null) this.values[filter.fieldname] = value
    }
    const push = (
      list: Array<{ label: string; action: () => unknown; group?: string }>,
      entry: { label: string; action: () => unknown; group?: string },
    ) => {
      const index = list.findIndex((item) => item.label === entry.label && item.group === entry.group)
      if (index >= 0) list.splice(index, 1)
      list.push(entry)
      this.notify()
    }
    this.page = {
      add_inner_button: (label: string, action: () => unknown, group?: string) =>
        push(this.innerButtons, { label, action, group }),
      add_menu_item: (label: string, action: () => unknown) => push(this.menuItems, { label, action }),
      add_action_item: (label: string, action: () => unknown) => push(this.menuItems, { label, action }),
      add_custom_button_group: (label: string) => {
        const existing = this.buttonGroups.find((group) => group.label === label)
        if (existing) return existing
        const group = { label, items: [] as Array<{ label: string; action: () => unknown }> }
        this.buttonGroups.push(group)
        this.notify()
        return group
      },
      add_custom_menu_item: (
        group: { items: Array<{ label: string; action: () => unknown }> },
        label: string,
        action: () => unknown,
      ) => {
        const index = group.items.findIndex((item) => item.label === label)
        if (index >= 0) group.items.splice(index, 1)
        group.items.push({ label, action })
        this.notify()
      },
      set_title: () => undefined,
    }
  }

  bind(runner: () => void): void {
    this.runner = runner
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getVersion(): number {
    return this.version
  }

  notify(): void {
    this.version += 1
    for (const listener of [...this.listeners]) listener()
  }

  get filters(): AnyRecord[] {
    return this.filterDefs.map((filter) => ({
      df: filter,
      get_value: () => this.values[filter.fieldname],
      set_value: (value: unknown) => this.set_filter_value(filter.fieldname, value),
      set_input: (value: unknown) => this.set_filter_value(filter.fieldname, value),
      refresh: () => this.notify(),
      toggle: (show: boolean) => this.toggle_filter_display(filter.fieldname, !show),
    }))
  }

  get_filter(name: string): AnyRecord | undefined {
    return this.filters.find((filter) => filter.df.fieldname === name)
  }

  get_filter_value(name: string): unknown {
    return this.values[name]
  }

  get_values(): AnyRecord {
    return { ...this.values }
  }

  get_filter_values(): AnyRecord {
    return { ...this.values }
  }

  set_filter_value(name: string | AnyRecord, value?: unknown, refresh = true): Promise<void> {
    const entries = typeof name === 'object' ? Object.entries(name) : [[name, value] as [string, unknown]]
    for (const [key, next] of entries) this.values[key] = next
    this.notify()
    if (refresh) this.scheduleRun()
    return Promise.resolve()
  }

  private runTimer: ReturnType<typeof setTimeout> | null = null

  scheduleRun(): void {
    if (this.runTimer) clearTimeout(this.runTimer)
    this.runTimer = setTimeout(() => {
      this.runTimer = null
      this.runner()
    }, 50)
  }

  toggle_filter_display(name: string, hide: boolean): void {
    if (hide) this.hiddenFilters.add(name)
    else this.hiddenFilters.delete(name)
    this.notify()
  }

  refresh(): void {
    this.runner()
  }

  refresh_report(): void {
    this.runner()
  }

  get_data(): AnyRecord[] {
    return this.data
  }
}

export function installReport(facade: ReportFacade | null): void {
  frappe.query_report = facade
}
