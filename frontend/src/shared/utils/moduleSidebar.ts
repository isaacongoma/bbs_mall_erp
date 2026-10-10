export interface SidebarReport {
  report_type?: string
  ref_doctype?: string
}

export interface SidebarItemData {
  key: string
  label: string
  link_to?: string | null
  link_type?: string | null
  type: string
  icon?: string | null
  child?: number
  collapsible?: number
  indent?: number
  keep_closed?: number
  url?: string | null
  show_arrow?: number
  filters?: string | null
  route?: string | null
  route_options?: string | null
  tab?: string | null
  open_in_new_tab?: number
  report?: SidebarReport | null
  nested_items?: SidebarItemData[]
}

export interface ModuleSidebarData {
  name: string
  module: string
  label: string
  app?: string
  header_icon?: string
  workspaces?: string[]
  module_onboarding?: string | null
  items: SidebarItemData[]
}

export function nestSidebarItems(items: SidebarItemData[]): SidebarItemData[] {
  const result: SidebarItemData[] = []
  let section: SidebarItemData | null = null
  for (const item of items) {
    if (item.type === 'Section Break') {
      section = { ...item, nested_items: [] }
      result.push(section)
    } else if (item.child && section) {
      section.nested_items!.push(item)
    } else {
      section = null
      result.push(item)
    }
  }
  return result.filter((item) => item.type !== 'Section Break' || (item.nested_items?.length ?? 0) > 0)
}

function filterQuery(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return {}
    const query: Record<string, string> = {}
    for (const entry of parsed) {
      if (!Array.isArray(entry)) continue
      const [field, operator, value] = entry.length >= 4 ? entry.slice(1) : entry
      query[String(field)] = operator === '=' ? String(value) : JSON.stringify([operator, value])
    }
    return query
  } catch {
    return {}
  }
}

function routeOptions(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]))
  } catch {
    return {}
  }
}

function withQuery(path: string, query: Record<string, string>): string {
  const search = new URLSearchParams(query).toString()
  return search ? `${path}?${search}` : path
}

export function sidebarRoute(item: SidebarItemData): string | undefined {
  if (item.type !== 'Link') return undefined
  const target = item.link_to ?? ''
  const encoded = encodeURIComponent(target)
  switch (item.link_type) {
    case 'URL':
      return item.url ?? undefined
    case 'Report': {
      if (!item.report) return undefined
      const query = item.report.report_type === 'Query Report' || item.report.report_type === 'Script Report'
      return query
        ? `/app/query-report/${encoded}`
        : `/app/${encodeURIComponent(item.report.ref_doctype ?? '')}/view/report/${encoded}`
    }
    case 'Workspace':
      return `/app/${encoded}`
    case 'Dashboard':
      return `/app/dashboard-view/${encoded}`
    case 'Page':
      return withQuery(`/app/${encoded}${item.route ? `/${item.route}` : ''}`, routeOptions(item.route_options))
    default:
      return withQuery(`/app/${encoded}`, { ...routeOptions(item.route_options), ...filterQuery(item.filters) })
  }
}
