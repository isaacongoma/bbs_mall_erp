import { router as appRouter } from '@/core/navigation'

type AnyRecord = Record<string, any>
type Navigator = (path: string, options?: { replace?: boolean }) => void

let navigator: Navigator | null = null
let currentPath = '/app'

function pathname(): string {
  try {
    return appRouter.currentRoute().path
  } catch {
    return typeof window === 'undefined' ? currentPath : window.location.pathname
  }
}

const router: AnyRecord = {
  current_route: [] as string[],
  routes: {} as AnyRecord,
  list_views: ['list', 'kanban', 'report', 'calendar', 'tree', 'gantt', 'dashboard', 'image', 'inbox', 'map'],
  list_views_route: {
    list: 'List',
    kanban: 'Kanban',
    report: 'Report',
    calendar: 'Calendar',
    tree: 'Tree',
    gantt: 'Gantt',
    dashboard: 'Dashboard',
    image: 'Image',
    inbox: 'Inbox',
    map: 'Map',
  },
  slug(name: string): string {
    return String(name).toLowerCase().replace(/ /g, '-')
  },
  unslug(name: string): string {
    return String(name).replace(/-/g, ' ')
  },
  current_path: () => pathname(),
  get_sub_path_string(route?: string): string {
    const path = (route ?? pathname()).split('?')[0] ?? ''
    return path
      .replace(/^\/+/, '')
      .replace(/^(app|desk)\/?/, '')
      .replace(/\/+$/, '')
  },
  get_sub_path(route?: string): string {
    return router.get_sub_path_string(route)
  },
}

export function setNavigator(next: Navigator | null): void {
  navigator = next
}

export function setCurrentLocation(pathname: string): void {
  currentPath = pathname
  const parts = pathname
    .replace(/^\/app\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part))
  router.current_route = parts
}

function encode(part: string): string {
  return encodeURIComponent(part)
}

export function routeToPath(route: unknown[]): string {
  const parts = route.flat().filter((entry) => entry !== undefined && entry !== null && entry !== '') as string[]
  if (!parts.length) return '/app'
  const first = String(parts[0])
  if (first.startsWith('/') || first.startsWith('http')) return first
  const [head, ...rest] = parts.map(String)
  const lowered = head!.toLowerCase()
  if (lowered === 'form') {
    const [doctype, name] = rest
    if (!doctype) return '/app'
    if (!name || name.startsWith('new-')) return `/app/${encode(doctype)}/new`
    return `/app/${encode(doctype)}/${encode(name)}`
  }
  if (lowered === 'list') {
    const [doctype, view] = rest
    if (!doctype) return '/app'
    return view && view.toLowerCase() !== 'list'
      ? `/app/${encode(doctype)}/view/${encode(view.toLowerCase())}`
      : `/app/${encode(doctype)}`
  }
  if (lowered === 'tree') return `/app/${encode(rest[0] ?? '')}/view/tree`
  if (lowered === 'query-report' || lowered === 'report') {
    return rest.length > 1 && lowered === 'report'
      ? `/app/${encode(rest[0]!)}/view/report`
      : `/app/query-report/${encode(rest[0] ?? '')}`
  }
  if (lowered === 'workspaces' || lowered === 'workspace') return '/app'
  if (lowered === 'dashboard-view') return `/app/dashboard-view/${encode(rest[0] ?? '')}`
  return `/app/${parts.map((part) => encode(String(part))).join('/')}`
}

export function applyRouteOptions(path: string, options: AnyRecord | null | undefined): string {
  if (!options) return path
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue
    query.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  }
  const suffix = query.toString()
  if (!suffix) return path
  return `${path}${path.includes('?') ? '&' : '?'}${suffix}`
}

export function navigateTo(route: unknown[], options: { replace?: boolean } = {}): Promise<void> {
  const path = routeToPath(route)
  if (navigator) navigator(path, options)
  else {
    try {
      if (options.replace) appRouter.replace(path as never)
      else appRouter.push(path as never)
    } catch {
      if (typeof window !== 'undefined') window.history.pushState(null, '', path)
    }
  }
  setCurrentLocation(path.split('?')[0] ?? path)
  return Promise.resolve()
}

export function getRoute(): string[] {
  const parts = pathname()
    .replace(/^\/app\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part))
  router.current_route = parts
  return [...parts]
}

export { router }
