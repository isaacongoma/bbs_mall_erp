import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ReportFacade, loadReportSettings, type ReportFilterDef } from '../frappe/queryReport'

type AnyRecord = Record<string, any>

const EMPTY_SETTINGS: AnyRecord = {}

interface Loaded {
  report: string
  settings: AnyRecord
}

export function useReportSettings(report: string, fallbackFilters: ReportFilterDef[]) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadReportSettings(report).then((settings) => {
      if (!cancelled) setLoaded({ report, settings })
    })
    return () => {
      cancelled = true
    }
  }, [report])

  const settings = loaded?.report === report ? loaded.settings : null
  const scriptFilters = settings?.filters as ReportFilterDef[] | undefined
  const filterDefs = scriptFilters?.length ? scriptFilters : fallbackFilters
  const ready = settings !== null
  const facade = useMemo(() => (ready ? new ReportFacade(report, settings ?? {}, filterDefs) : null), [ready, report, settings, filterDefs])
  const subscribe = useMemo(() => (listener: () => void) => facade?.subscribe(listener) ?? (() => undefined), [facade])
  useSyncExternalStore(subscribe, () => facade?.getVersion() ?? 0)
  return { settings: settings ?? EMPTY_SETTINGS, facade, ready }
}
