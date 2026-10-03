import { getRouteGuards } from '@/core/modules/registry'
import { resolveLocation } from './routeTable'
import type { CurrentRoute } from './types'

let lastResolved: CurrentRoute | null = null

export async function runRouteGuards(to: CurrentRoute): Promise<string | null> {
  const from = lastResolved
  for (const guard of getRouteGuards()) {
    const result = await guard({ to, from })
    if (result) {
      lastResolved = to
      return resolveLocation(result)
    }
  }
  lastResolved = to
  return null
}
