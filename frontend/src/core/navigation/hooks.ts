import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { matchLocation } from './routeTable'
import { router, type CrmRouter } from './router'
import type { CurrentRoute } from './types'

export function useRoute(): CurrentRoute {
  const { pathname, search, hash } = useLocation()
  return useMemo(() => matchLocation(pathname, search, hash), [pathname, search, hash])
}

export function useRouter(): CrmRouter {
  return router
}
