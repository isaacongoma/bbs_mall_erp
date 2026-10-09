import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ListViewFacade, loadListSettings } from '../frappe/listView'

type AnyRecord = Record<string, any>

const EMPTY_SETTINGS: AnyRecord = {}

interface Loaded {
  doctype: string
  settings: AnyRecord
  facade: ListViewFacade
}

export function useListViewSettings(doctype: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadListSettings(doctype).then((settings) => {
      if (cancelled) return
      const facade = new ListViewFacade(doctype)
      settings.onload?.(facade)
      setLoaded({ doctype, settings, facade })
    })
    return () => {
      cancelled = true
    }
  }, [doctype])

  const current = loaded?.doctype === doctype ? loaded : null
  const facade = current?.facade ?? null
  const subscribe = useMemo(() => (listener: () => void) => facade?.subscribe(listener) ?? (() => undefined), [facade])
  const version = useSyncExternalStore(subscribe, () => facade?.getVersion() ?? 0)
  return { settings: current?.settings ?? EMPTY_SETTINGS, facade, version }
}
