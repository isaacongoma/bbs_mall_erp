import { useCallback, useEffect, useState } from 'react'
import { rpc } from '@/core/api/rpc'

type AnyRecord = Record<string, any>

export interface ReportviewQuery {
  doctype: string
  fields: string[]
  filters: unknown[]
  orderBy: string
  start: number
  pageLength: number
}

interface Outcome {
  key: string
  rows: AnyRecord[]
  total: number | null
  error: string | null
}

function unwrap(value: unknown): any {
  if (value && typeof value === 'object' && 'message' in (value as object)) return (value as AnyRecord).message
  return value
}

function expand(payload: any): AnyRecord[] {
  if (payload && Array.isArray(payload.keys) && Array.isArray(payload.values)) {
    const keys = payload.keys as string[]
    return (payload.values as unknown[][]).map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index]])))
  }
  return Array.isArray(payload) ? payload : []
}

export function tableField(doctype: string, fieldname: string): string {
  return '`tab' + doctype + '`.`' + fieldname + '`'
}

export function useReportviewList(query: ReportviewQuery | null) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [version, setVersion] = useState(0)
  const key = query ? `${version}:${JSON.stringify(query)}` : ''

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    const request = JSON.parse(key.slice(key.indexOf(':') + 1)) as ReportviewQuery
    void (async () => {
      try {
        const data = await rpc<unknown>({
          url: 'frappe.desk.reportview.get',
          method: 'POST',
          params: {
            doctype: request.doctype,
            fields: request.fields,
            filters: request.filters,
            order_by: request.orderBy,
            start: request.start,
            page_length: request.pageLength,
            with_comment_count: 1,
          },
        })
        const rows = expand(unwrap(data))
        const count = await rpc<unknown>({
          url: 'frappe.desk.reportview.get_count',
          method: 'POST',
          params: { doctype: request.doctype, filters: request.filters },
        }).catch(() => null)
        if (!cancelled) setOutcome({ key, rows, total: count === null ? null : Number(unwrap(count)), error: null })
      } catch (failure) {
        if (!cancelled) setOutcome({ key, rows: [], total: null, error: failure instanceof Error ? failure.message : String(failure) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [key])

  const reload = useCallback(() => setVersion((value) => value + 1), [])
  const current = outcome && outcome.key === key ? outcome : null
  return {
    rows: current?.rows ?? outcome?.rows ?? [],
    total: current?.total ?? outcome?.total ?? null,
    loading: Boolean(key) && !current,
    error: current?.error ?? null,
    reload,
  }
}
