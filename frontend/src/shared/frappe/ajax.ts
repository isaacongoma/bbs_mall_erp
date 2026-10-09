import jquery from 'jquery'
import { useAuthStore } from '@/core/auth/authStore'

type AnyRecord = Record<string, any>

const METHOD_PATTERN = /^\/api\/(?:v\d+\/)?method\/([^?]+)(\?.*)?$/

export function rewriteUrl(url: string): string {
  const match = METHOD_PATTERN.exec(url)
  if (!match) return url
  const method = match[1]!.replace(/\/+$/, '')
  return `/api/erpnext/method/${method}/${match[2] ?? ''}`
}

function parseFormBody(body: string): AnyRecord {
  const result: AnyRecord = {}
  for (const [key, value] of new URLSearchParams(body)) {
    try {
      result[key] = JSON.parse(value)
    } catch {
      result[key] = value
    }
  }
  return result
}

function requestBody(options: AnyRecord): string | undefined {
  const method = String(options.type ?? 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') return undefined
  const data = options.data
  if (data === undefined || data === null) return JSON.stringify({})
  if (typeof data !== 'string') return JSON.stringify(data)
  const contentType = String(options.contentType ?? '')
  if (contentType.includes('application/json')) return data
  return JSON.stringify(parseFormBody(data))
}

async function send(url: string, options: AnyRecord, headers: AnyRecord, token: string | null, signal: AbortSignal) {
  const body = requestBody(options)
  const merged: Record<string, string> = { Accept: 'application/json' }
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string' && value !== '') merged[key] = value
  }
  if (body !== undefined) merged['Content-Type'] = 'application/json'
  if (token) merged.Authorization = `Bearer ${token}`
  return fetch(url, { method: String(options.type ?? 'GET').toUpperCase(), headers: merged, body, signal })
}

function headerString(response: Response): string {
  const lines: string[] = []
  response.headers.forEach((value, key) => lines.push(`${key}: ${value}`))
  return lines.join('\r\n')
}

let installed = false

export function installAjaxBridge(): void {
  if (installed) return
  installed = true
  const $ = jquery as unknown as AnyRecord

  $.ajaxTransport('+*', (options: AnyRecord) => {
    const url = String(options.url ?? '')
    if (!url.startsWith('/api/')) return undefined
    const controller = new AbortController()
    const target = rewriteUrl(url)
    return {
      send(headers: AnyRecord, complete: (status: number, text: string, responses: AnyRecord, raw?: string) => void) {
        void (async () => {
          try {
            const auth = useAuthStore.getState()
            let response = await send(target, options, headers, auth.access, controller.signal)
            if (response.status === 401 && auth.refresh) {
              const refreshed = await auth.tryRefresh()
              if (refreshed) {
                response = await send(target, options, headers, useAuthStore.getState().access, controller.signal)
              }
            }
            const text = await response.text()
            complete(response.status, response.statusText, { text }, headerString(response))
          } catch (error) {
            if ((error as Error)?.name === 'AbortError') complete(0, 'abort', { text: '' })
            else complete(0, 'error', { text: String((error as Error)?.message ?? error) })
          }
        })()
      },
      abort() {
        controller.abort()
      },
    }
  })
}
