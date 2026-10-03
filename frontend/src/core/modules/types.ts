import type { ComponentType } from 'react'
import type { ModuleEndpoints } from '@/core/api/endpointRegistry'
import type { CurrentRoute, RouteLocation } from '@/core/navigation/types'

export interface NavigationItem {
  id: string
  label: string
  to: RouteLocation
  icon?: ComponentType<{ className?: string }> | string
  order?: number
  section?: string
  sectionOrder?: number
  desktopOnly?: boolean
}

export interface SidebarSlotProps {
  collapsed: boolean
  mobile: boolean
}

export interface ShellContributions {
  sidebarTop?: ComponentType<SidebarSlotProps>
  sidebarSections?: ComponentType<SidebarSlotProps>
  sidebarFooter?: ComponentType<SidebarSlotProps>
  sidebarPanels?: ComponentType<SidebarSlotProps>
  headerActions?: ComponentType
  overlays?: ComponentType<{ mobile: boolean }>
}

export type RouteComponentLoader = () => Promise<{ default: ComponentType<any> }>

export interface ModuleRoute {
  name: string
  path: string
  aliases?: string[]
  meta?: Record<string, unknown>
  component?: RouteComponentLoader
}

export interface GuardContext {
  to: CurrentRoute
  from: CurrentRoute | null
}

export type RouteGuardResult = RouteLocation | null | undefined | void

export type RouteGuard = (context: GuardContext) => Promise<RouteGuardResult> | RouteGuardResult

export interface SettingsPageDefinition {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }> | string
  component: ComponentType
  condition?: () => boolean
}

export interface SettingsGroup {
  label: string
  items: SettingsPageDefinition[]
  condition?: () => boolean
}

export interface ModuleDefinition {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }> | string
  railOrder?: number
  endpoints?: ModuleEndpoints
  routes?: ModuleRoute[]
  guards?: RouteGuard[]
  navigation?: NavigationItem[]
  settings?: SettingsGroup[]
  shell?: ShellContributions
}
