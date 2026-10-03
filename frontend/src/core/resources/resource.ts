import type { HttpMethod } from '@/core/api/http'
import { rpc, type RpcParams } from '@/core/api/rpc'
import { getConfig } from './config'
import { debounce, type Debounced } from './debounce'
import { getLocal, saveLocal } from './local'
import { Observable } from './observable'
import type { CacheKey } from './types'

type Validate = (params: any) => string | void | Promise<string | void>

export interface FetchOverrides<TRaw = any> {
  validate?: Validate
  beforeSubmit?: (params: any) => void
  onSuccess?: (raw: TRaw) => void
  onError?: (error: unknown) => void
  onData?: (raw: TRaw) => void
}

export interface ResourceOptions<TData = any, TRaw = any> extends FetchOverrides<TRaw> {
  url: string
  method?: HttpMethod
  params?: any
  cache?: CacheKey
  auto?: boolean
  initialData?: TData | null
  debounce?: number
  transform?: (raw: TRaw) => TData | null | undefined | void
  makeParams?: (params: any) => any
  onFetch?: (params: any) => void
  resourceFetcher?: (request: {
    url: string
    method?: HttpMethod
    params?: RpcParams
    signal?: AbortSignal
  }) => Promise<unknown>
}

export interface ResourceUpdate {
  method?: HttpMethod
  url?: string
  params?: any
  auto?: boolean
}

const registry = new Map<string, Resource<any, any>>()

export function getCacheKey(cache: CacheKey | null | undefined): string | null {
  if (!cache) return null
  return JSON.stringify(typeof cache === 'string' ? [cache] : cache)
}

export function getCachedResource<TData = any>(cache: CacheKey): Resource<TData> | null {
  const key = getCacheKey(cache)
  return key ? ((registry.get(key) as Resource<TData> | undefined) ?? null) : null
}

function clone<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T)
}

export class Resource<TData = any, TRaw = any> extends Observable {
  method: HttpMethod | undefined
  url: string
  data: TData | null
  previousData: TData | null = null
  loading = false
  fetched = false
  error: any = null
  promise: Promise<unknown> | null = null
  auto: boolean | undefined
  params: any = null

  private readonly options: ResourceOptions<TData, TRaw>
  private readonly cacheKey: string | null
  private controller = new AbortController()
  private started = false
  private readonly runFetch: (params?: any, overrides?: FetchOverrides<TRaw>) => Promise<TData | null | undefined>
  private readonly debouncedFetch: Debounced<[any?, FetchOverrides<TRaw>?], TData | null | undefined> | null

  constructor(options: ResourceOptions<TData, TRaw>, cacheKey: string | null = null) {
    super()
    this.options = options
    this.cacheKey = cacheKey
    this.method = options.method
    this.url = options.url
    this.data = options.initialData ?? null
    this.auto = options.auto
    this.params = options.params ?? null
    this.runFetch = (params, overrides) => this.execute(params, overrides)
    this.debouncedFetch = options.debounce ? debounce(this.runFetch, options.debounce) : null
  }

  readonly fetch = (params?: any, overrides: FetchOverrides<TRaw> = {}): Promise<TData | null | undefined> =>
    this.debouncedFetch ? this.debouncedFetch(params, overrides) : this.runFetch(params, overrides)

  readonly reload = this.fetch

  readonly submit = this.fetch

  readonly abort = (): void => {
    this.controller.abort()
    this.debouncedFetch?.cancel()
  }

  readonly reset = (): void => {
    this.data = this.options.initialData ?? null
    this.previousData = null
    this.loading = false
    this.fetched = false
    this.error = null
    this.params = null
    this.auto = this.options.auto
    this.notify()
  }

  readonly update = ({ method, url, params, auto }: ResourceUpdate): void => {
    if (method && method !== this.options.method) this.method = method
    if (url && url !== this.options.url) this.url = url
    if (params && params !== this.options.params) this.params = params
    if (auto !== undefined && auto !== this.auto) this.auto = auto
    this.notify()
  }

  readonly setData = (next: TRaw | null | ((current: TData | null) => TRaw | null)): void => {
    const value = typeof next === 'function' ? (next as (current: TData | null) => TRaw | null)(this.data) : next
    this.data = this.applyTransform(value as TRaw)
    this.notify()
  }

  get hasStarted(): boolean {
    return this.started
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.hydrateFromLocal()
    if (this.options.auto) void this.fetch().catch(() => undefined)
  }

  private hydrateFromLocal(): void {
    if (!this.cacheKey) return
    void getLocal<TRaw>(this.cacheKey).then((stored) => {
      if ((this.loading || !this.fetched) && stored) {
        this.setData(stored)
        this.options.onData?.(stored)
      }
    })
  }

  private applyTransform(raw: TRaw): TData | null {
    if (this.options.transform) {
      const result = this.options.transform(raw)
      if (result != null) return result as TData
    }
    return raw as unknown as TData | null
  }

  private handleError(error: unknown, handlers: (((error: unknown) => void) | undefined)[]): never {
    this.loading = false
    if (this.previousData) this.data = this.previousData
    this.error = error
    this.notify()
    for (const handler of handlers) handler?.(error)
    if (handlers.every((handler) => !handler)) {
      const fallback = getConfig('fallbackErrorHandler')
      if (fallback) {
        try {
          fallback(error)
        } catch (fallbackError) {
          console.warn('Error in fallbackErrorHandler', fallbackError)
        }
      }
    }
    throw error
  }

  private async execute(rawParams?: any, overrides: FetchOverrides<TRaw> = {}): Promise<TData | null | undefined> {
    const fetcher = this.options.resourceFetcher ?? getConfig('resourceFetcher') ?? rpc

    let params = rawParams instanceof Event ? null : rawParams
    params = params || this.params
    if (this.options.makeParams) params = this.options.makeParams(params)

    this.params = params
    this.previousData = clone(this.data)
    this.loading = true
    this.error = null
    this.notify()

    this.options.onFetch?.(this.params)
    this.options.beforeSubmit?.(this.params)
    overrides.beforeSubmit?.(this.params)

    const errorHandlers = [this.options.onError, overrides.onError]
    const validate = overrides.validate ?? this.options.validate
    if (validate) {
      try {
        const invalid = await validate(this.params)
        if (invalid && typeof invalid === 'string') throw new Error(invalid)
      } catch (error) {
        this.handleError(error, errorHandlers)
      }
    }

    this.controller = new AbortController()

    try {
      const pending = fetcher({
        url: this.url,
        method: this.method,
        params: params || this.options.params,
        signal: this.controller.signal,
      }) as Promise<TRaw>
      this.promise = pending
      const raw = await pending
      void saveLocal(this.cacheKey, raw)
      this.data = this.applyTransform(raw)
      this.fetched = true
      this.notify()
      this.options.onSuccess?.(raw)
      overrides.onSuccess?.(raw)
      this.options.onData?.(raw)
      overrides.onData?.(raw)
    } catch (error) {
      if ((error as { name?: string } | null)?.name !== 'AbortError') {
        this.handleError(error, errorHandlers)
      }
    }

    this.loading = false
    this.notify()
    return this.data
  }
}

export interface CreateResourceOptions {
  defer?: boolean
}

export function createResource<TData = any, TRaw = any>(
  options: ResourceOptions<TData, TRaw> | string,
  { defer = false }: CreateResourceOptions = {},
): Resource<TData, TRaw> {
  const resolved: ResourceOptions<TData, TRaw> = typeof options === 'string' ? { url: options, auto: true } : options

  const cacheKey = getCacheKey(resolved.cache)
  if (cacheKey) {
    const existing = registry.get(cacheKey) as Resource<TData, TRaw> | undefined
    if (existing) {
      if (existing.auto && !defer) void existing.reload().catch(() => undefined)
      return existing
    }
  }

  const resource = new Resource<TData, TRaw>(resolved, cacheKey)
  if (cacheKey) registry.set(cacheKey, resource)
  if (!defer) resource.start()
  return resource
}
