import { registerEndpoints } from '@/core/api/endpointRegistry'
import { registerRoutes } from '@/core/navigation/routeTable'
import type {
  ModuleDefinition,
  ModuleRoute,
  NavigationItem,
  RouteGuard,
  SettingsGroup,
  ShellContributions,
} from './types'

const modules = new Map<string, ModuleDefinition>()

export function registerModule(definition: ModuleDefinition): void {
  if (modules.has(definition.id)) throw new Error(`Module "${definition.id}" is already registered`)
  modules.set(definition.id, definition)
  if (definition.endpoints) registerEndpoints(definition.endpoints)
  if (definition.routes) {
    registerRoutes(definition.routes.map(({ name, path, aliases, meta }) => ({ name, path, aliases, meta })))
  }
}

export function getModules(): ModuleDefinition[] {
  return [...modules.values()]
}

export function getModuleRoutes(): ModuleRoute[] {
  return getModules().flatMap((module) => module.routes ?? [])
}

export function getRouteGuards(): RouteGuard[] {
  return getModules().flatMap((module) => module.guards ?? [])
}

export function getRailModules(): ModuleDefinition[] {
  return getModules()
    .filter((module) => module.rail === true || (module.navigation?.length ?? 0) > 0)
    .sort((a, b) => (a.railOrder ?? 0) - (b.railOrder ?? 0))
}

export function getModuleForRoute(routeName: string | null | undefined): ModuleDefinition | undefined {
  if (!routeName) return undefined
  return getModules().find(
    (module) => (module.routes ?? []).some((route) => route.name === routeName) && (module.navigation?.length ?? 0) > 0,
  )
}

export function getNavigation(moduleId?: string): NavigationItem[] {
  return getModules()
    .filter((module) => !moduleId || module.id === moduleId)
    .flatMap((module) => module.navigation ?? [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getShellContributions<K extends keyof ShellContributions>(
  key: K,
  moduleId?: string,
): NonNullable<ShellContributions[K]>[] {
  return getModules()
    .filter((module) => !moduleId || module.id === moduleId)
    .map((module) => module.shell?.[key])
    .filter((slot): slot is NonNullable<ShellContributions[K]> => slot != null)
}

export function getSettingsGroups(): SettingsGroup[] {
  return getModules().flatMap((module) => module.settings ?? [])
}
