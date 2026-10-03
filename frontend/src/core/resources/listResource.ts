import { getConfig } from './config'
import { Observable } from './observable'
import { createResource, getCacheKey, type Resource } from './resource'
import { getLocal, saveLocal } from './local'
import type { CacheKey, DocRecord } from './types'

type Row = DocRecord

interface ChildHandlers {
  onSuccess?: (data: any) => void
  onError?: (error: unknown) => void
}

export interface ListResourceOptions extends ChildHandlers {
  doctype: string
  fields?: unknown
  filters?: unknown
  orFilters?: unknown
  orderBy?: string
  start?: number
  pageLength?: number
  groupBy?: string
  parent?: string
  debug?: number
  url?: string
  auto?: boolean
  cache?: CacheKey
  transform?: (data: any) => any
  onData?: (data: any) => void
  fetchOne?: ChildHandlers
  insert?: ChildHandlers
  setValue?: ChildHandlers
  delete?: ChildHandlers
  runDocMethod?: ChildHandlers
}

const listRegistry = new Map<string, ListResource>()
const resourcesByDoctype = new Map<string, ListResource[]>()

export function getCachedListResource(cache: CacheKey): ListResource | null {
  const key = getCacheKey(cache)
  return key ? (listRegistry.get(key) ?? null) : null
}

export function updateRowInListResource(doctype: string, doc: DocRecord): void {
  if (!doc?.name) return
  for (const resource of resourcesByDoctype.get(doctype) ?? []) {
    resource.applyRowUpdate(doc)
  }
}

export function deleteRowInListResource(doctype: string, docname: string | number): void {
  for (const resource of resourcesByDoctype.get(doctype) ?? []) {
    resource.removeRow(docname)
  }
}

export function revertRowInListResource(doctype: string, doc: DocRecord): void {
  for (const resource of resourcesByDoctype.get(doctype) ?? []) {
    resource.revertRow(doc)
  }
}

export class ListResource extends Observable {
  doctype: string
  fields: unknown
  filters: unknown
  orFilters: unknown
  orderBy: string | undefined
  start: number
  pageLength: number
  groupBy: string | undefined
  parent: string | undefined
  debug: number
  originalData: Row[] | null = null
  dataMap: Record<string, Row> = {}
  data: any = null
  hasPreviousPage = false
  hasNextPage = true
  auto: boolean | undefined

  readonly list: Resource<any, Row[]>
  readonly fetchOne: Resource<any, Row[]>
  readonly insert: Resource<any, any>
  readonly setValue: Resource<any, any>
  readonly delete: Resource<any, any>
  readonly runDocMethod: Resource<any, any>

  private readonly options: ListResourceOptions
  private readonly cacheKey: string | null
  private started = false

  constructor(options: ListResourceOptions, cacheKey: string | null) {
    super()
    this.options = options
    this.cacheKey = cacheKey
    this.doctype = options.doctype
    this.fields = options.fields
    this.filters = options.filters
    this.orFilters = options.orFilters
    this.orderBy = options.orderBy
    this.start = options.start || 0
    this.pageLength = options.pageLength || 20
    this.groupBy = options.groupBy
    this.parent = options.parent
    this.debug = options.debug || 0
    this.auto = options.auto

    const listUrl = options.url || getConfig('defaultListUrl')

    this.list = createResource<any, Row[]>(
      {
        url: listUrl,
        makeParams: () => ({
          doctype: this.doctype,
          fields: this.fields,
          filters: this.filters,
          or_filters: this.orFilters,
          order_by: this.orderBy,
          start: this.start,
          limit: this.pageLength,
          limit_start: this.start,
          limit_page_length: this.pageLength,
          group_by: this.groupBy,
          parent: this.parent,
          debug: this.debug,
        }),
        onSuccess: (data) => {
          this.hasPreviousPage = !!this.start
          this.hasNextPage = data.length >= this.pageLength
          const paged = !this.start ? data : (this.originalData ?? []).concat(data)
          void saveLocal(this.cacheKey, paged)
          this.setData(paged)
          options.onSuccess?.(this.data)
        },
        onError: options.onError,
      },
      { defer: true },
    )

    this.fetchOne = createResource<any, Row[]>(
      {
        url: listUrl,
        makeParams: (name: string) => ({ doctype: this.doctype, fields: this.fields || '*', filters: { name } }),
        onSuccess: (data) => {
          const doc = data[0]
          if (doc && this.originalData) updateRowInListResource(this.doctype, doc)
          options.fetchOne?.onSuccess?.(this.data)
        },
        onError: options.fetchOne?.onError,
      },
      { defer: true },
    )

    this.insert = createResource(
      {
        url: getConfig('defaultDocInsertUrl'),
        makeParams: (values: Row) => ({ doc: { doctype: this.doctype, ...values } }),
        onSuccess: (data) => {
          void this.list.fetch().catch(() => undefined)
          options.insert?.onSuccess?.(data)
        },
        onError: options.insert?.onError,
      },
      { defer: true },
    )

    this.setValue = createResource(
      {
        url: getConfig('defaultDocUpdateUrl'),
        makeParams: ({ name, ...values }: Row) => ({ doctype: this.doctype, name, fieldname: values }),
        onSuccess: (doc) => {
          updateRowInListResource(this.doctype, doc)
          options.setValue?.onSuccess?.(doc)
        },
        onError: options.setValue?.onError,
      },
      { defer: true },
    )

    this.delete = createResource(
      {
        url: getConfig('defaultDocDeleteUrl'),
        makeParams: (name: string) => ({ doctype: this.doctype, name }),
        onSuccess: (data) => {
          void this.list.fetch().catch(() => undefined)
          options.delete?.onSuccess?.(data)
        },
        onError: options.delete?.onError,
      },
      { defer: true },
    )

    this.runDocMethod = createResource(
      {
        url: getConfig('defaultRunDocMethodUrl'),
        makeParams: ({ method, name, ...values }: Row) => ({
          dt: this.doctype,
          dn: name,
          method,
          args: values,
        }),
        onSuccess: (data) => {
          if (data?.docs) {
            for (const doc of data.docs as Row[]) updateRowInListResource(doc.doctype, doc)
          }
          options.runDocMethod?.onSuccess?.(data)
        },
        onError: options.runDocMethod?.onError,
      },
      { defer: true },
    )

    for (const child of [this.list, this.fetchOne, this.insert, this.setValue, this.delete, this.runDocMethod]) {
      this.forward(child)
    }

    if (cacheKey) listRegistry.set(cacheKey, this)
    const siblings = resourcesByDoctype.get(this.doctype) ?? []
    siblings.push(this)
    resourcesByDoctype.set(this.doctype, siblings)
  }

  get hasStarted(): boolean {
    return this.started
  }

  boot(): void {
    if (this.started) return
    this.started = true
    for (const child of [this.list, this.fetchOne, this.insert, this.setValue, this.delete, this.runDocMethod]) {
      child.start()
    }
    if (this.cacheKey) {
      void getLocal<Row[]>(this.cacheKey).then((stored) => {
        if ((this.list.loading || !this.list.fetched) && stored) {
          this.setData(stored)
          this.options.onData?.(stored)
        }
      })
    }
    if (this.options.auto) void this.list.fetch().catch(() => undefined)
  }

  readonly update = (updated: Partial<ListResourceOptions> & Record<string, unknown>): void => {
    Object.assign(this, updated)
    this.notify()
  }

  readonly transform = (data: any): any => {
    if (this.options.transform) {
      const result = this.options.transform(data)
      if (result != null) return result
    }
    return data
  }

  readonly reload = (): Promise<unknown> => {
    const originalStart = this.start
    const originalPageLength = this.pageLength
    if (this.start > 0) {
      this.start = 0
      this.pageLength = this.originalData?.length ?? this.pageLength
    }
    return this.list.fetch().finally(() => {
      this.start = originalStart
      this.pageLength = originalPageLength
      this.notify()
    })
  }

  readonly fetch = (): void => {
    void this.reload().catch(() => undefined)
  }

  readonly setData = (data: Row[] | ((current: any) => Row[])): void => {
    const rows = typeof data === 'function' ? data(this.data) : data
    this.originalData = rows
    this.data = this.transform(rows)
    this.rebuildDataMap()
    this.notify()
  }

  readonly previous = (): void => {
    this.start -= this.pageLength
    void this.list.fetch().catch(() => undefined)
  }

  readonly next = (): void => {
    this.start += this.pageLength
    void this.list.fetch().catch(() => undefined)
  }

  readonly getRow = (name: string | number): Row | undefined => this.dataMap[name.toString()]

  applyRowUpdate(doc: DocRecord): void {
    if (!this.originalData) return
    for (const row of this.originalData) {
      if (row.name && row.name == doc.name) {
        delete row._previousData
        const previous = JSON.stringify(row)
        for (const key of Object.keys(row)) {
          if (key in doc) row[key] = doc[key]
        }
        row._previousData = previous
      }
    }
    this.data = this.transform(this.originalData)
    this.rebuildDataMap()
    this.notify()
  }

  removeRow(docname: string | number): void {
    if (!this.originalData) return
    this.originalData = this.originalData.filter((row) => row.name.toString() !== docname.toString())
    this.data = this.transform(this.originalData)
    this.rebuildDataMap()
    this.notify()
  }

  revertRow(doc: DocRecord): void {
    if (!this.originalData) return
    for (const row of this.originalData) {
      if (row.name && row.name == doc.name && row._previousData) {
        const previous = JSON.parse(row._previousData as string) as Row
        for (const key of Object.keys(row)) row[key] = previous[key]
        delete row._previousData
      }
    }
    this.data = this.transform(this.originalData)
    this.rebuildDataMap()
    this.notify()
  }

  private rebuildDataMap(): void {
    if (!Array.isArray(this.data)) return
    const map: Record<string, Row> = {}
    for (const row of this.data as Row[]) {
      if (row?.name) map[row.name.toString()] = row
    }
    this.dataMap = map
  }
}

export function createListResource(options: ListResourceOptions, { defer = false } = {}): ListResource {
  if (!options.doctype) throw new Error('List resource requires doctype')

  const cacheKey = getCacheKey(options.cache)
  if (cacheKey) {
    const existing = listRegistry.get(cacheKey)
    if (existing) {
      if (existing.auto && !defer) existing.fetch()
      return existing
    }
  }

  const resource = new ListResource(options, cacheKey)
  if (!defer) resource.boot()
  return resource
}
