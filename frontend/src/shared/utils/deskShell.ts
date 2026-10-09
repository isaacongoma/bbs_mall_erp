import type { ModuleSidebarData } from './moduleSidebar'
import { sidebarRoute } from './moduleSidebar'

export interface DockEntry {
  link_type: string
  link_to: string
  title: string
  icon?: string | null
  url?: string | null
  hidden?: number
}

export interface DeskApp {
  app_name: string
  app_title: string
  app_logo_url?: string | null
  app_route?: string
  on_apps_screen?: boolean
  sequence_id?: number
  dock: DockEntry[]
}

export interface DeskShellData {
  dock: Record<string, DockEntry[]>
  apps: DeskApp[]
  sidebars: Record<string, ModuleSidebarData>
  canonicalShell: Record<string, Record<string, string>>
  homeShell: string
  unread: number
}

export const EMPTY_SHELL: DeskShellData = {
  dock: {},
  apps: [],
  sidebars: {},
  canonicalShell: {},
  homeShell: '',
  unread: 0,
}

export function visibleDock(shell: DeskShellData, appName: string): DockEntry[] {
  return (shell.dock[appName] ?? []).filter((entry) => !entry.hidden && shell.sidebars[entry.link_to])
}

export function appOfShell(shell: DeskShellData, sidebar: string): string | undefined {
  return Object.keys(shell.dock).find((app) => shell.dock[app]!.some((entry) => entry.link_to === sidebar))
}

export function shellForPath(shell: DeskShellData, pathname: string): string | undefined {
  const parts = pathname
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part))
  if (parts[0] !== 'app' || parts.length < 2) return undefined
  if (parts[1] === 'query-report' && parts[2]) return shell.canonicalShell.Report?.[parts[2]]
  if (parts[1] === 'dashboard-view' && parts[2]) return shell.canonicalShell.Dashboard?.[parts[2]]
  const target = parts[1]!
  const workspaceShell = Object.values(shell.sidebars).find((sidebar) => sidebar.workspaces?.includes(target))
  return shell.canonicalShell.DocType?.[target] ?? shell.canonicalShell.Page?.[target] ?? workspaceShell?.name
}

export function shellLanding(shell: DeskShellData, sidebar: string): string | undefined {
  const data = shell.sidebars[sidebar]
  if (!data) return undefined
  for (const item of data.items) {
    const path = sidebarRoute(item)
    if (path) return path
  }
  return undefined
}
