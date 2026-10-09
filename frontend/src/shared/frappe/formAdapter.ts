import type { DocField } from '../types/meta'
import { $ } from './runtime'

type AnyRecord = Record<string, any>

export interface ActionButtonView {
  key: string
  label: string
  variant: 'solid' | 'subtle' | 'outline' | 'ghost'
  theme: 'gray' | 'red'
  icon?: string
  disabled: boolean
  loading: boolean
  onClick: () => void
}

export interface MenuOptionView {
  label: string
  onclick?: () => void
  disabled?: boolean
  theme?: string
  shortcut?: string
  icon?: string
  group?: string
  hide_label?: boolean
  options?: MenuOptionView[]
}

export interface InnerItemView {
  key: string
  kind: 'button' | 'group' | 'message'
  label: string
  button?: ActionButtonView
  options?: MenuOptionView[]
  primary?: boolean
}

export interface PageView {
  title: string
  subtitle: string
  indicator: { label: string; color: string } | null
  breadcrumbs: Array<{ label: string; href?: string; title?: string }>
  primary: ActionButtonView | null
  secondary: ActionButtonView | null
  menu: MenuOptionView[]
  actions: MenuOptionView[]
  menuVisible: boolean
  actionsVisible: boolean
  inner: InnerItemView[]
  icons: Array<{ key: string; label: string; icon: string; onClick: () => void }>
}

export interface MessageView {
  html: string
  color: string
  permanent: boolean
}

function labelOf(button: JQuery): string {
  const label = button.find('.es-button__label').first().text().trim()
  return label || (button.attr('data-label') ? decodeURIComponent(button.attr('data-label') as string) : button.text().trim())
}

function buttonView(button: JQuery, key: string): ActionButtonView | null {
  if (!button?.length) return null
  if (button.hasClass('hide') || button.css('display') === 'none') return null
  const variant = (button.attr('data-variant') ?? 'subtle') as ActionButtonView['variant']
  const theme = button.attr('data-theme') === 'red' ? 'red' : 'gray'
  const iconName = button.attr('data-icon')
  return {
    key,
    label: labelOf(button),
    variant,
    theme,
    icon: iconName ? `lucide-${iconName}` : undefined,
    disabled: Boolean(button.prop('disabled')),
    loading: button.attr('aria-busy') === 'true',
    onClick: () => {
      button.trigger('click')
    },
  }
}

function options(page: AnyRecord, store: JQuery): MenuOptionView[] {
  if (!store?.length) return []
  const raw = page.build_dropdown_options(store) as MenuOptionView[]
  return raw
}

function innerItems(page: AnyRecord): InnerItemView[] {
  const toolbar = page.inner_toolbar as JQuery
  if (!toolbar?.length) return []
  const items: InnerItemView[] = []
  toolbar.children().each((_index: number, element: HTMLElement) => {
    const node = $(element)
    if (node.hasClass('hide')) return
    if (node.hasClass('inner-group-button')) {
      const label = decodeURIComponent(node.attr('data-label') ?? '')
      const store = node.children('.dropdown-menu')
      const groupOptions = page.build_inner_group_options(store) as MenuOptionView[]
      if (!groupOptions.length) return
      items.push({
        key: `group:${label}`,
        kind: 'group',
        label,
        options: groupOptions,
        primary: node.find('button').first().attr('data-variant') === 'solid',
      })
      return
    }
    if (element.tagName === 'BUTTON') {
      const view = buttonView(node, `button:${labelOf(node)}`)
      if (view) items.push({ key: view.key, kind: 'button', label: view.label, button: view })
      return
    }
    if (node.hasClass('inner-page-message')) {
      items.push({ key: `message:${node.text()}`, kind: 'message', label: node.text() })
    }
  })
  return items
}

export function readPage(frm: AnyRecord): PageView | null {
  const page = frm.page as AnyRecord | undefined
  if (!page?.menu) return null
  const indicator = page.indicator as JQuery | undefined
  const indicatorVisible = indicator && !indicator.hasClass('hide')
  const breadcrumbs = (page.get_breadcrumbs?.() ?? []) as PageView['breadcrumbs']
  return {
    title: String(page.title ?? frm.docname ?? ''),
    subtitle: String(page.$sub_title_area?.text?.() ?? ''),
    indicator: indicatorVisible
      ? { label: String(indicator.text()).trim(), color: String(indicator.attr('data-theme') ?? 'gray') }
      : null,
    breadcrumbs,
    primary: buttonView(page.btn_primary, 'primary'),
    secondary: buttonView(page.btn_secondary, 'secondary'),
    menu: options(page, page.menu),
    actions: options(page, page.actions),
    menuVisible: !page.menu_btn_group?.hasClass('hide'),
    actionsVisible: !page.actions_btn_group?.hasClass('hide'),
    inner: innerItems(page),
    icons: ((page.icon_group as JQuery | undefined)?.children('button').toArray() ?? []).map((element, index) => {
      const node = $(element)
      return {
        key: `icon:${index}`,
        label: String(node.attr('title') ?? ''),
        icon: String(
          node.attr('data-icon-name') ??
            node.attr('class')?.match(/(prev|next)-doc/)?.[1] ??
            node.find('use').attr('href')?.replace('#icon-', '') ??
            'chevron-right',
        ),
        onClick: () => {
          node.trigger('click')
        },
      }
    }),
  }
}

export function readMessages(frm: AnyRecord): MessageView[] {
  const container = frm.layout?.message as JQuery | undefined
  if (!container?.length || container.hasClass('hidden')) return []
  const messages: MessageView[] = []
  container.children().each((_index: number, element: HTMLElement) => {
    const node = $(element)
    const color = (/(?:^|\s)(yellow|blue|red|green|orange|gray|grey)(?:\s|$)/.exec(element.className)?.[1] ?? 'blue')
    messages.push({
      html: node.clone().find('.close, .btn-close, button.close').remove().end().html() ?? '',
      color,
      permanent: node.find('.close, .btn-close').length === 0,
    })
  })
  return messages
}

export interface LayoutView {
  tabs: Array<{
    name: string
    label?: string
    hidden: boolean
    showDashboard: boolean
    sections: Array<{
      name: string
      label?: string
      hidden: boolean
      hideBorder: boolean
      collapsible: boolean
      collapsed: boolean
      columns: Array<{ name: string; label?: string; fields: DocField[] }>
    }>
  }>
  overrides: Record<string, Partial<DocField>>
}

function controlOverrides(control: AnyRecord): Partial<DocField> {
  const df = control.df as AnyRecord
  const status = control.disp_status ?? 'Write'
  const hidden =
    status === 'None' ||
    (typeof df.get_status !== 'function' && Boolean(df.hidden)) ||
    Boolean(df.hidden_due_to_dependency)
  const readOnly = status === 'Read' || Boolean(df.read_only)
  return {
    hidden: hidden ? 1 : 0,
    read_only: readOnly ? 1 : 0,
    reqd: df.reqd || df.mandatory_via_depends_on ? 1 : 0,
    label: df.label,
    options: df.options,
    description: df.description,
  } as Partial<DocField>
}

export function readLayout(frm: AnyRecord): LayoutView | null {
  const layout = frm.layout as AnyRecord | undefined
  if (!layout?.sections) return null
  const overrides: Record<string, Partial<DocField>> = {}
  for (const control of layout.fields_list as AnyRecord[]) {
    const df = control?.df as AnyRecord | undefined
    if (!df?.fieldname || ['Section Break', 'Column Break', 'Tab Break'].includes(df.fieldtype)) continue
    overrides[df.fieldname] = controlOverrides(control)
  }

  const tabViews = (layout.tabs as AnyRecord[]).length ? (layout.tabs as AnyRecord[]) : [null]
  const tabs: LayoutView['tabs'] = tabViews.map((tab) => ({
    name: tab ? String(tab.df.fieldname) : `${frm.doctype}-tab-0`,
    label: tab ? String(tab.df.label ?? '') : undefined,
    hidden: tab ? Boolean(tab.hidden || tab.df.hidden || tab.df.hidden_due_to_dependency) : false,
    showDashboard: tab ? Boolean(tab.df.show_dashboard) : false,
    sections: [],
  }))

  for (const section of layout.sections as AnyRecord[]) {
    const owner = (layout.tabs as AnyRecord[]).findIndex(
      (tab) => tab.wrapper?.[0] && section.wrapper?.[0] && $.contains(tab.wrapper[0], section.wrapper[0]),
    )
    const target = tabs[owner >= 0 ? owner : 0]
    if (!target) continue
    const df = section.df as AnyRecord
    const columns = (section.columns as AnyRecord[]).map((column) => ({
      name: `${section.df.fieldname}:${column.df.fieldname}`,
      label: column.df.label ? String(column.df.label) : undefined,
      fields: ((section.fields_list ?? []) as AnyRecord[])
        .filter((control) => {
          if (!control?.df?.fieldname) return false
          if (column.wrapper?.[0]?.contains?.(control.wrapper)) {
            control.__homeColumn = column
            return true
          }
          return control.__homeColumn === column
        })
        .map((control) => control.df as DocField),
    }))
    target.sections.push({
      name: String(df.fieldname),
      label: df.label ? String(df.label) : undefined,
      hidden: Boolean(df.hidden || df.hidden_due_to_dependency),
      hideBorder: Boolean(df.hide_border),
      collapsible: Boolean(df.collapsible),
      collapsed: typeof section.is_collapsed === 'function' ? Boolean(section.is_collapsed()) : false,
      columns,
    })
  }
  return { tabs, overrides }
}


export interface DashboardView {
  groups: Array<{
    label: string
    items: Array<{ doctype: string; count?: number | string; openCount?: number; canCreate: boolean; fieldname?: string }>
  }>
  reports: Array<{ label: string; items: string[] }>
  indicators: Array<{ label: string; color: string }>
  progress: Array<{ title: string; message: string; bars: Array<{ width: string; className: string; title: string }> }>
}

export function readDashboard(frm: AnyRecord): DashboardView | null {
  const dashboard = frm.dashboard as AnyRecord | undefined
  if (!dashboard || frm.doc?.__islocal) return null
  const data = (dashboard.data ?? {}) as AnyRecord
  const counts = (frm.dashboard_data?.count ?? {}) as AnyRecord
  const found: AnyRecord[] = [...(counts.internal_links_found ?? []), ...(counts.external_links_found ?? [])]
  const groups = ((data.transactions ?? []) as AnyRecord[]).map((group) => ({
    label: String(group.label ?? ''),
    items: ((group.items ?? []) as string[]).map((doctype) => {
      const entry = found.find((candidate) => candidate.doctype === doctype)
      return {
        doctype,
        count: entry?.count,
        openCount: entry?.open_count,
        canCreate: Boolean(frm.can_create?.(doctype)),
        fieldname: (data.non_standard_fieldnames?.[doctype] as string | undefined) ?? (data.fieldname as string | undefined),
      }
    }),
  }))
  const indicators: DashboardView['indicators'] = []
  dashboard.stats_area_row?.find?.('.indicator-column .indicator').each((_index: number, element: HTMLElement) => {
    const color = /(?:^|\s)(green|red|orange|blue|yellow|gray|grey|purple|pink)(?:\s|$)/.exec(element.className)?.[1] ?? 'gray'
    indicators.push({ label: $(element).text(), color })
  })
  const progress: DashboardView['progress'] = []
  dashboard.progress_area?.body?.find?.('.progress-chart').each((_index: number, element: HTMLElement) => {
    const chart = $(element)
    progress.push({
      title: String(chart.attr('title') ?? ''),
      message: chart.find('.progress-message').text(),
      bars: chart
        .find('.progress-bar')
        .toArray()
        .map((bar: HTMLElement) => ({
          width: String((bar as HTMLElement).style.width || '0%'),
          className: String((bar as HTMLElement).className),
          title: String(bar.getAttribute('title') ?? ''),
        })),
    })
  })
  const reports = ((data.reports ?? []) as AnyRecord[]).map((report) =>
    Array.isArray(report.items)
      ? { label: String(report.label ?? ''), items: (report.items as unknown[]).map(String) }
      : { label: '', items: [String(report.name ?? report)] },
  )
  if (!groups.length && !indicators.length && !progress.length && !reports.length) return null
  return { groups, reports, indicators, progress }
}
