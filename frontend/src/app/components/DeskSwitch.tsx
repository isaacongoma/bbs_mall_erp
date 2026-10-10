import { createElement, lazy, Suspense, useEffect, useState, type ComponentType, type ReactElement } from 'react'
import { useLocation } from 'react-router-dom'
import { getModuleRoutes } from '@/core/modules/registry'
import { matchLocation } from '@/core/navigation'
import { PagePending } from '@/shared/components/Shimmer'
import { loadDeskBoot } from '@/shared/frappe/boot'

const cache = new Map<string, ComponentType>()

function pageFor(name: string): ReactElement | null {
  const cached = cache.get(name)
  if (cached) return createElement(cached, { key: name })
  const loader = getModuleRoutes().find((route) => route.name === name)?.component
  if (!loader) return null
  const component = lazy(loader as () => Promise<{ default: ComponentType }>)
  cache.set(name, component)
  return createElement(component, { key: name })
}

function Pending() {
  return <PagePending />
}

export function DeskSwitch() {
  const location = useLocation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    const done = () => {
      if (live) setReady(true)
    }
    loadDeskBoot().then(done, done)
    return () => {
      live = false
    }
  }, [])

  if (!ready) return <Pending />
  const route = matchLocation(location.pathname, location.search, location.hash)
  const page = route.name ? pageFor(route.name) : null
  if (!page) return <Pending />
  return <Suspense fallback={<Pending />}>{page}</Suspense>
}
