import { useEffect, useMemo } from 'react'
import { useObservable } from '@/core/resources'
import { createMetaApi, fetchMeta, useMetaStore, type MetaApi } from '../stores/metaStore'
import type { DocTypeMeta } from '../types/meta'

export interface UseMeta extends MetaApi {
  doctypeMeta: DocTypeMeta | null
  doctypesMeta: Record<string, DocTypeMeta>
  userSettings: Record<string, any>
}

export function useMeta(doctype: string): UseMeta {
  const doctypesMeta = useMetaStore((state) => state.doctypesMeta)
  const userSettings = useMetaStore((state) => state.userSettings)

  useEffect(() => {
    if (doctype) fetchMeta(doctype)
  }, [doctype])

  const api = useMemo(() => createMetaApi(doctype, doctypesMeta, userSettings), [doctype, doctypesMeta, userSettings])
  useObservable(api.meta)

  return useMemo(
    () => ({ ...api, doctypeMeta: doctypesMeta[doctype] ?? null, doctypesMeta, userSettings }),
    [api, doctype, doctypesMeta, userSettings],
  )
}
