import { matchPath } from 'react-router-dom'
import { toInternal } from './canonicalPath'
import type { CurrentRoute, NamedLocation, RouteDefinition, RouteLocation, RouteParams } from './types'

const definitions: RouteDefinition[] = []
const byName = new Map<string, RouteDefinition>()

const CATCH_ALL_PATTERN = /^\/:[A-Za-z0-9_]+$/

function isCatchAll(definition: RouteDefinition): boolean {
  return CATCH_ALL_PATTERN.test(definition.path)
}

export function registerRoutes(routes: RouteDefinition[]): void {
  for (const route of routes) {
    if (!byName.has(route.name)) byName.set(route.name, route)
    definitions.push(route)
  }
  definitions.sort((a, b) => Number(isCatchAll(a)) - Number(isCatchAll(b)))
}

export function getRouteDefinition(name: string): RouteDefinition | undefined {
  return byName.get(name)
}

export function buildPath(pattern: string, params: RouteParams = {}): string {
  const path = pattern.replace(/\/:([A-Za-z0-9_]+)(\?)?/g, (_match, key: string, optional?: string) => {
    const value = params[key]
    if (value === undefined || value === null || value === '') {
      if (optional) return ''
      throw new Error(`Missing required param "${key}" for route pattern "${pattern}"`)
    }
    return `/${encodeURIComponent(String(value))}`
  })
  return path === '' ? '/' : path
}

export function serializeQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) value.forEach((item) => search.append(key, String(item)))
    else search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export function normalizeHash(hash: string | undefined): string {
  if (!hash) return ''
  return hash.startsWith('#') ? hash : `#${hash}`
}

export function resolveLocation(to: RouteLocation): string {
  if (typeof to === 'string') return to
  const { name, path, params, query, hash } = to as NamedLocation
  let pathname = path
  if (name) {
    const definition = byName.get(name)
    if (!definition) throw new Error(`Route "${name}" is not registered`)
    pathname = buildPath(definition.path, params)
  }
  return `${pathname ?? '/'}${serializeQuery(query)}${normalizeHash(hash)}`
}

function parseQuery(search: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  new URLSearchParams(search).forEach((value, key) => {
    const existing = result[key]
    if (existing === undefined) result[key] = value
    else if (Array.isArray(existing)) existing.push(value)
    else result[key] = [existing, value]
  })
  return result
}

export function matchLocation(rawPathname: string, search = '', hash = ''): CurrentRoute {
  const pathname = toInternal(rawPathname)
  const base: CurrentRoute = {
    name: null,
    path: pathname,
    fullPath: `${pathname}${search}${hash}`,
    params: {},
    query: parseQuery(search),
    hash,
    meta: {},
    matched: false,
  }

  for (const definition of definitions) {
    for (const pattern of [definition.path, ...(definition.aliases ?? [])]) {
      const match = matchPath({ path: pattern.replace(/\/:([A-Za-z0-9_]+)\?/g, '/:$1?'), end: true }, pathname)
      if (match) {
        const params: Record<string, string> = {}
        for (const [key, value] of Object.entries(match.params)) if (value !== undefined) params[key] = value
        return { ...base, name: definition.name, params, meta: definition.meta ?? {}, matched: true }
      }
    }
  }
  return base
}
