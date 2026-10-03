import { useAuthStore } from '@/core/auth/authStore'
import { ApiError } from './errors'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface HttpOptions {
  params?: Record<string, unknown>
  body?: unknown
  signal?: AbortSignal
}

function buildUrl(url: string, params?: Record<string, unknown>) {
  if (!params) return url
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    const serialized = Array.isArray(value)
      ? value.join(',')
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
    search.set(key, serialized)
  }
  const query = search.toString()
  return query ? `${url}?${query}` : url
}

function parseJson(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function toApiError(response: Response, text: string, data: unknown): ApiError {
  const record = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const detail = typeof record.detail === 'string' ? record.detail : null
  const messages = detail ? [detail] : Object.values(record).flat().map(String)
  const message = detail ?? (data ? JSON.stringify(data) : text.slice(0, 200)) ?? ''
  return new ApiError(
    message || `Request failed: ${response.status}`,
    response.status,
    messages,
    typeof record.exc_type === 'string' ? record.exc_type : null,
  )
}

async function send(method: HttpMethod, url: string, options: HttpOptions, token: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const hasBody = method !== 'GET'
  const body = hasBody ? JSON.stringify(options.body !== undefined ? options.body : {}) : undefined
  return fetch(url, { method, headers, body, signal: options.signal })
}

export async function httpJson<T = unknown>(method: HttpMethod, url: string, options: HttpOptions = {}): Promise<T> {
  const fullUrl = buildUrl(url, options.params)
  const auth = useAuthStore.getState()

  let response = await send(method, fullUrl, options, auth.access)

  if (response.status === 401 && auth.refresh) {
    const refreshed = await auth.tryRefresh()
    if (refreshed) {
      response = await send(method, fullUrl, options, useAuthStore.getState().access)
    }
  }

  const text = await response.text()
  const data = parseJson(text)
  if (!response.ok) throw toApiError(response, text, data)
  return data as T
}
