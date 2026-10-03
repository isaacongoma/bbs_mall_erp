import { useEffect, useMemo } from 'react'
import { useObservable } from '@/core/resources'
import { getDocumentBundle, type DocumentOverrides } from '../data/document'

export function useDocument(doctype: string, docname?: string | number | null, resourceOverrides?: DocumentOverrides) {
  const bundle = useMemo(
    () => getDocumentBundle(doctype, docname, resourceOverrides),
    [doctype, docname, resourceOverrides],
  )

  useObservable(bundle.document)
  useObservable(bundle.assignees)
  useObservable(bundle.permissions)
  useObservable(bundle.error)

  useEffect(() => {
    if (!docname) void bundle.setupFormScript()
  }, [bundle, docname])

  return { ...bundle, error: bundle.error.value }
}
