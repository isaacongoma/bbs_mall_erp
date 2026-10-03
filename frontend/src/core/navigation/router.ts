import { matchLocation, resolveLocation } from './routeTable'
import type { CurrentRoute, NamedLocation, RouteLocation } from './types'

type NavigateFn = (to: string, options?: { replace?: boolean }) => void | Promise<void>

interface RouterBinding {
  navigate: NavigateFn
  back: () => void
  forward: () => void
  getLocation: () => { pathname: string; search: string; hash: string }
}

let binding: RouterBinding | null = null
let previous: CurrentRoute | null = null

export function bindRouter(next: RouterBinding): void {
  binding = next
}

function requireBinding(): RouterBinding {
  if (!binding) throw new Error('Router is not bound yet')
  return binding
}

export interface CrmRouter {
  push: (to: RouteLocation) => void
  replace: (to: RouteLocation) => void
  back: () => void
  forward: () => void
  resolve: (to: RouteLocation) => { href: string }
  currentRoute: () => CurrentRoute
  previousRoute: () => CurrentRoute | null
}

export function getCurrentRoute(): CurrentRoute {
  const { pathname, search, hash } = requireBinding().getLocation()
  return matchLocation(pathname, search, hash)
}

export function rememberPreviousRoute(route: CurrentRoute): void {
  previous = route
}

export const router: CrmRouter = {
  push(to) {
    const replace = typeof to === 'object' && (to as NamedLocation).replace === true
    void requireBinding().navigate(resolveLocation(to), { replace })
  },
  replace(to) {
    void requireBinding().navigate(resolveLocation(to), { replace: true })
  },
  back() {
    requireBinding().back()
  },
  forward() {
    requireBinding().forward()
  },
  resolve(to) {
    return { href: resolveLocation(to) }
  },
  currentRoute: getCurrentRoute,
  previousRoute: () => previous,
}

export function getRouter(): CrmRouter {
  return router
}
