import {
  createBrowserRouter,
  createMemoryRouter,
  redirect,
  type LoaderFunctionArgs,
  type RouteObject,
} from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'
import { getModuleRoutes } from '@/core/modules/registry'
import type { ModuleRoute } from '@/core/modules/types'
import { canonicalPath, matchLocation } from '@/core/navigation'
import { loadDeskBoot } from '@/shared/frappe/boot'
import { runRouteGuards } from '@/core/navigation/guards'
import { AppRoot } from './components/AppRoot'
import { RouteError } from './components/RouteError'
import { DeskSwitch } from './components/DeskSwitch'

const NO_BASENAME = '/'

function normalizeBasename(base: string): string {
  const trimmed = base.replace(/\/+$/, '')
  return trimmed === '' ? NO_BASENAME : trimmed
}

function stripBasename(pathname: string, basename: string): string {
  if (basename === NO_BASENAME) return pathname
  if (pathname === basename) return '/'
  return pathname.startsWith(`${basename}/`) ? pathname.slice(basename.length) : pathname
}

function createGuardLoader(basename: string) {
  return async ({ request }: LoaderFunctionArgs) => {
    if (!useAuthStore.getState().access) return null
    const url = new URL(request.url)
    const pathname = stripBasename(url.pathname, basename)
    if (/^\/(app|desk)(\/|$)/.test(pathname)) {
      await loadDeskBoot().catch(() => undefined)
      const canonical = canonicalPath(pathname)
      if (canonical !== pathname) return redirect(`${canonical}${url.search}${url.hash}`)
    }
    const to = matchLocation(pathname, url.search, url.hash)
    const target = await runRouteGuards(to)
    if (target) return redirect(target)
    return null
  }
}

function toRouteObjects(route: ModuleRoute): RouteObject[] {
  const loader = route.component
  return [route.path, ...(route.aliases ?? [])].map((path) => {
    const relative = path.replace(/^\//, '')
    const base = { handle: { name: route.name, meta: route.meta ?? {} } }
    const lazy = loader ? async () => ({ Component: (await loader()).default }) : undefined
    if (relative === '') return { ...base, index: true, lazy } as RouteObject
    return { ...base, path: relative, lazy } as RouteObject
  })
}

export function buildRouteObjects(basename: string = NO_BASENAME): RouteObject[] {
  return [
    {
      id: 'root',
      path: '/',
      Component: AppRoot,
      ErrorBoundary: RouteError,
      loader: createGuardLoader(normalizeBasename(basename)),
      shouldRevalidate: () => true,
      children: [...getModuleRoutes().flatMap(toRouteObjects), { path: 'desk/*', Component: DeskSwitch }],
    },
  ]
}

export function createAppRouter(basename: string = import.meta.env.BASE_URL) {
  const normalized = normalizeBasename(basename)
  return createBrowserRouter(buildRouteObjects(normalized), { basename: normalized })
}

export function createTestRouter(initialEntries: string[], basename: string = NO_BASENAME) {
  return createMemoryRouter(buildRouteObjects(basename), { initialEntries, basename: normalizeBasename(basename) })
}
