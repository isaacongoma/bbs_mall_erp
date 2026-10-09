import { frappe } from './runtime'
import { ensureDoctypeScripts } from './scriptLoader'

type AnyRecord = Record<string, any>
type Listener = () => void

frappe.provide('frappe.views')
;(frappe.views as AnyRecord).KanbanView ??= {
  show_kanban_dialog(doctype: string) {
    frappe.set_route('List', doctype, 'Kanban')
  },
}

export interface ListAction {
  label: string
  action: () => unknown
  group?: string
}

export class ListViewFacade {
  doctype: string
  view = 'List'
  columns: AnyRecord[] = []
  data: AnyRecord[] = []
  actionItems: ListAction[] = []
  menuItems: ListAction[] = []
  innerButtons: ListAction[] = []
  buttonGroups: Array<{ label: string; items: ListAction[] }> = []
  page: AnyRecord
  private listeners = new Set<Listener>()
  private version = 0
  private checked: () => AnyRecord[] = () => []
  private reload: () => void = () => undefined

  constructor(doctype: string) {
    this.doctype = doctype
    const dedupe = (list: ListAction[], entry: ListAction) => {
      const index = list.findIndex((item) => item.label === entry.label && item.group === entry.group)
      if (index >= 0) list.splice(index, 1)
      list.push(entry)
      this.notify()
    }
    const fields: AnyRecord = {}
    this.page = {
      add_action_item: (label: string, action: () => unknown) => dedupe(this.actionItems, { label, action }),
      add_menu_item: (label: string, action: () => unknown) => dedupe(this.menuItems, { label, action }),
      add_inner_button: (label: string, action: () => unknown, group?: string) =>
        dedupe(this.innerButtons, { label, action, group }),
      add_custom_button_group: (label: string) => {
        const existing = this.buttonGroups.find((group) => group.label === label)
        if (existing) return existing
        const group = { label, items: [] as ListAction[] }
        this.buttonGroups.push(group)
        this.notify()
        return group
      },
      add_custom_menu_item: (group: { items: ListAction[] }, label: string, action: () => unknown) => {
        const index = group.items.findIndex((item) => item.label === label)
        if (index >= 0) group.items.splice(index, 1)
        group.items.push({ label, action })
        this.notify()
      },
      set_title: () => undefined,
      fields_dict: new Proxy(fields, {
        get: (target, key: string) => (target[key] ??= { get_query: undefined, df: {}, fieldname: key }),
      }),
    }
  }

  setData(rows: AnyRecord[]): void {
    this.data = rows
  }

  bind(checked: () => AnyRecord[], reload: () => void): void {
    this.checked = checked
    this.reload = reload
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

  get_checked_items(onlyNames = false): any[] {
    const docs = this.checked()
    return onlyNames ? docs.map((doc) => doc.name) : docs
  }

  call_for_selected_items(method: string, args: AnyRecord = {}): void {
    args.names = this.get_checked_items(true)
    void frappe.call({
      method,
      args,
      freeze: true,
      callback: (response: AnyRecord) => {
        if (!response.exc) this.refresh()
      },
    })
  }

  refresh(): void {
    this.reload()
  }

  render_header(): void {
    this.notify()
  }
}

export function getListSettings(doctype: string): AnyRecord {
  return (frappe.listview_settings?.[doctype] as AnyRecord | undefined) ?? {}
}

export async function loadListSettings(doctype: string): Promise<AnyRecord> {
  await ensureDoctypeScripts(doctype)
  return getListSettings(doctype)
}

export function settingsFilters(settings: AnyRecord): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const raw = typeof settings.filters === 'function' ? settings.filters() : settings.filters
  for (const entry of (raw ?? []) as unknown[]) {
    if (Array.isArray(entry)) {
      const [field, operator, value] = entry.length === 4 ? entry.slice(1) : entry
      result[String(field)] = operator === '=' ? value : [operator, value]
    }
  }
  return result
}

export function indicatorFor(settings: AnyRecord, doc: AnyRecord): { label: string; color: string } | null {
  const result = typeof settings.get_indicator === 'function' ? settings.get_indicator.call(settings, doc) : null
  if (result?.length) return { label: String(result[0]), color: String(result[1] ?? 'gray') }
  return null
}
