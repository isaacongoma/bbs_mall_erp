import { create } from 'zustand'
import { createResource, type Resource } from '@/core/resources'

export interface CrmView {
  name: string
  label?: string
  type: string
  dt?: string
  icon?: any
  pinned?: boolean | number
  public?: boolean | number
  is_standard?: boolean | number
  is_default?: boolean | number
  route_name?: string
  [key: string]: any
}

interface ViewsState {
  viewsByName: Record<string, CrmView>
  pinnedViews: CrmView[]
  publicViews: CrmView[]
  standardViews: Record<string, CrmView>
  defaultViews: Record<string, CrmView>
}

export const useViewsStore = create<ViewsState>(() => ({
  viewsByName: {},
  pinnedViews: [],
  publicViews: [],
  standardViews: {},
  defaultViews: {},
}))

let viewsResource: Resource<CrmView[]> | null = null

export function ensureViewsLoaded(): Resource<CrmView[]> {
  if (viewsResource) return viewsResource

  viewsResource = createResource<CrmView[], CrmView[]>({
    url: 'crm.api.views.get_views',
    params: { doctype: '' },
    cache: 'crm-views',
    initialData: [],
    auto: true,
    transform(views) {
      const viewsByName: Record<string, CrmView> = {}
      const pinnedViews: CrmView[] = []
      const publicViews: CrmView[] = []
      const standardViews: Record<string, CrmView> = {}
      const defaultViews: Record<string, CrmView> = {}

      const next = views.map((source) => {
        const view = { ...source, type: source.type || 'list' }
        viewsByName[view.name] = view
        if (view.pinned) pinnedViews.push(view)
        if (view.public) publicViews.push(view)
        if (view.is_standard && view.dt) standardViews[`${view.dt} ${view.type}`] = view
        if (view.is_default && view.route_name) defaultViews[view.route_name] = view
        return view
      })

      useViewsStore.setState({ viewsByName, pinnedViews, publicViews, standardViews, defaultViews })
      return next
    },
  })
  return viewsResource
}

const HOME_ROUTE_PRIORITY = ['Leads', 'Deals', 'Contacts', 'Organizations', 'Notes', 'Tasks', 'Call Logs']

export function getDefaultView(routeName: string | null = null): CrmView | null {
  const { defaultViews } = useViewsStore.getState()
  if (routeName) return defaultViews[routeName] || null
  const candidates = [...HOME_ROUTE_PRIORITY, ...Object.keys(defaultViews).sort()]
  const route = candidates.find((candidate) => defaultViews[candidate])
  return route ? (defaultViews[route] ?? null) : null
}

export function getViewDetails(
  view: string | null | undefined,
  type?: string | null,
  doctype: string | null = null,
): CrmView | null {
  const resolvedType = type || 'list'
  const { standardViews, viewsByName } = useViewsStore.getState()
  if (!view && doctype) return standardViews[`${doctype} ${resolvedType}`] || null
  return view ? (viewsByName[view] ?? null) : null
}

export function getPinnedViews(): CrmView[] {
  return useViewsStore.getState().pinnedViews
}

export function getPublicViews(): CrmView[] {
  return useViewsStore.getState().publicViews
}

export async function reloadViews(): Promise<void> {
  await ensureViewsLoaded().reload()
}
