import { useEffect, useState } from 'react'
import { loadDeskBoot } from '../frappe/boot'
import { EMPTY_SHELL, type DeskApp, type DeskShellData, type DockEntry } from '../utils/deskShell'
import type { ModuleSidebarData } from '../utils/moduleSidebar'

type AnyRecord = Record<string, any>

export function useDeskShell(): DeskShellData {
  const [shell, setShell] = useState<DeskShellData>(EMPTY_SHELL)
  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const load = (attempt: number) => {
      loadDeskBoot()
        .then((boot: AnyRecord) => {
          if (cancelled) return
          setShell({
            dock: (boot.dock as Record<string, DockEntry[]> | undefined) ?? {},
            apps: ((boot.app_data as DeskApp[] | undefined) ?? []).filter((app) => app.dock?.length),
            sidebars: (boot.module_sidebars as Record<string, ModuleSidebarData> | undefined) ?? {},
            canonicalShell: (boot.canonical_shell as Record<string, Record<string, string>> | undefined) ?? {},
            homeShell: String(boot.home_shell ?? ''),
            unread: Number(boot.notification_unread_count ?? 0),
          })
        })
        .catch(() => {
          if (!cancelled && attempt < 8) timer = window.setTimeout(() => load(attempt + 1), 3000)
        })
    }
    load(0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])
  return shell
}
