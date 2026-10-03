export type RouteParams = Record<string, string | number | null | undefined>

export interface NamedLocation {
  name?: string
  path?: string
  params?: RouteParams
  query?: Record<string, unknown>
  hash?: string
  replace?: boolean
}

export type RouteLocation = string | NamedLocation

export interface RouteDefinition {
  name: string
  path: string
  aliases?: string[]
  meta?: Record<string, unknown>
}

export interface CurrentRoute {
  name: string | null
  path: string
  fullPath: string
  params: Record<string, string>
  query: Record<string, string | string[]>
  hash: string
  meta: Record<string, unknown>
  matched: boolean
}
