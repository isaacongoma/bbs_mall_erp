import { useEffect, useState, useSyncExternalStore } from 'react'
import { formsVersion, subscribeForms } from '../frappe/formStore'
import { openForm } from '../frappe/formView'

type AnyRecord = Record<string, any>

export type FrappeFormState =
  | { status: 'loading'; frm: null; error: null }
  | { status: 'ready'; frm: AnyRecord; error: null }
  | { status: 'error'; frm: null; error: Error }

interface Settled {
  key: string
  frm: AnyRecord | null
  error: Error | null
}

export function useFrappeForm(doctype: string, name: string | undefined): FrappeFormState & { version: number } {
  const key = `${doctype}\u0000${name ?? ''}`
  const [settled, setSettled] = useState<Settled | null>(null)
  const version = useSyncExternalStore(subscribeForms, formsVersion, formsVersion)

  useEffect(() => {
    let cancelled = false
    openForm(doctype, name).then(
      (frm) => {
        if (!cancelled) setSettled({ key, frm, error: null })
      },
      (error: unknown) => {
        console.error(error)
        if (!cancelled) setSettled({ key, frm: null, error: error instanceof Error ? error : new Error(String(error)) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [doctype, name, key])

  if (!settled || settled.key !== key) return { status: 'loading', frm: null, error: null, version }
  if (settled.error) return { status: 'error', frm: null, error: settled.error, version }
  return { status: 'ready', frm: settled.frm as AnyRecord, error: null, version }
}
