import { getConfig } from './config'
import { Observable } from './observable'
import { createResource, getCacheKey, type FetchOverrides, type Resource } from './resource'
import { deleteLocal, getLocal, saveLocal } from './local'
import { deleteRowInListResource, revertRowInListResource, updateRowInListResource } from './listResource'
import type { DocRecord } from './types'

interface WhitelistedMethodOptions {
  method: string
  onSuccess?: (message: any) => void
  makeParams?: (values: any) => any
  transform?: (message: any) => any
  [key: string]: unknown
}

export interface DocumentResourceOptions {
  doctype: string
  name: string | number
  auto?: boolean
  debounce?: number
  realtime?: boolean
  transform?: (doc: DocRecord) => DocRecord | void
  onSuccess?: (doc: DocRecord) => void
  onError?: (error: unknown) => void
  setValue?: {
    validate?: (data: any) => void
    onSuccess?: (data: any) => void
    onError?: (error: unknown) => void
  }
  delete?: { onSuccess?: () => void; onError?: (error: unknown) => void }
  whitelistedMethods?: Record<string, string | WhitelistedMethodOptions>
}

const documentRegistry = new Map<string, DocumentResource>()

export function getCachedDocumentResource(doctype: string, name: string | number): DocumentResource | null {
  const key = getCacheKey([doctype, name])
  return key ? (documentRegistry.get(key) ?? null) : null
}

function clone<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T)
}

export class DocumentResource extends Observable {
  doctype: string
  name: string | number
  doc: DocRecord | null = null
  originalDoc: DocRecord | null = null
  auto: boolean
  previousDoc: string | null = null

  readonly get: Resource<any, DocRecord>
  readonly setValue: Resource<any, DocRecord>
  readonly setValueDebounced: Resource<any, DocRecord>
  readonly save: Resource<any, DocRecord>
  readonly delete: Resource<any, any>
  readonly methods: Record<string, Resource<any, any>> = {}

  private readonly options: DocumentResourceOptions
  private readonly cacheKey: string
  private started = false
  private dirtyCache: { doc: DocRecord | null; original: DocRecord | null; value: boolean } | null = null

  constructor(options: DocumentResourceOptions, cacheKey: string) {
    super()
    this.options = options
    this.cacheKey = cacheKey
    this.doctype = options.doctype
    this.name = options.name
    this.auto = options.auto !== undefined ? options.auto : true

    const setValueOptions = {
      url: getConfig('defaultDocUpdateUrl'),
      makeParams: (values: DocRecord) => ({ doctype: this.doctype, name: this.name, fieldname: values }),
      validate: (data: any) => options.setValue?.validate?.(data),
      beforeSubmit: (params: any) => {
        this.previousDoc = JSON.stringify(this.doc)
        if (this.doc) this.doc = { ...this.doc, ...(params.fieldname || {}) }
        if (this.doc) updateRowInListResource(this.doctype, this.doc)
        this.notify()
      },
      onSuccess: (data: DocRecord) => {
        this.doc = this.applyTransform(data)
        this.originalDoc = clone(this.doc)
        options.setValue?.onSuccess?.(data)
        this.notify()
      },
      onError: (error: unknown) => {
        this.doc = this.previousDoc ? (JSON.parse(this.previousDoc) as DocRecord) : this.doc
        options.setValue?.onError?.(error)
        if (this.doc) revertRowInListResource(this.doctype, this.doc)
        this.notify()
      },
    }

    this.get = createResource<any, DocRecord>(
      {
        url: getConfig('defaultDocGetUrl'),
        method: 'GET',
        makeParams: () => ({ doctype: this.doctype, name: this.name }),
        onSuccess: (data) => {
          void saveLocal(this.cacheKey, data)
          this.doc = this.applyTransform(data)
          this.originalDoc = clone(this.doc)
          this.notify()
          options.onSuccess?.(this.doc as DocRecord)
        },
        onError: (error) => {
          void deleteLocal(this.cacheKey)
          this.doc = null
          this.originalDoc = null
          this.notify()
          options.onError?.(error)
        },
      },
      { defer: true },
    )

    this.setValue = createResource(setValueOptions, { defer: true })
    this.setValueDebounced = createResource({ ...setValueOptions, debounce: options.debounce || 500 }, { defer: true })

    this.save = createResource(
      {
        ...setValueOptions,
        makeParams: () => ({ doctype: this.doctype, name: this.name, fieldname: this.getChangedFields() }),
      },
      { defer: true },
    )
    const saveFetch = this.save.fetch
    const saveIfChanged = (params?: any, overrides?: FetchOverrides<DocRecord>) => {
      if (Object.keys(this.getChangedFields()).length === 0) return Promise.resolve(this.doc)
      return saveFetch(params, overrides)
    }
    Object.assign(this.save, { fetch: saveIfChanged, reload: saveIfChanged, submit: saveIfChanged })

    this.delete = createResource(
      {
        url: getConfig('defaultDocDeleteUrl'),
        makeParams: () => ({ doctype: this.doctype, name: this.name }),
        onSuccess: () => {
          this.doc = null
          options.delete?.onSuccess?.()
          deleteRowInListResource(this.doctype, this.name)
          this.notify()
        },
        onError: options.delete?.onError,
      },
      { defer: true },
    )

    for (const [key, spec] of Object.entries(options.whitelistedMethods ?? {})) {
      const { method, onSuccess, makeParams, transform, ...rest } =
        typeof spec === 'string' ? ({ method: spec } as WhitelistedMethodOptions) : spec
      this.methods[key] = createResource(
        {
          url: getConfig('defaultRunDocMethodUrl'),
          makeParams: (values: any) => ({
            dt: this.doctype,
            dn: this.name,
            method,
            args: makeParams ? makeParams(values) : values,
          }),
          transform: (data: any) => {
            if (transform) {
              const result = transform(data?.message)
              if (result != null) return result
            }
            return data?.message
          },
          onSuccess: (data: any) => {
            for (const doc of (data?.docs ?? []) as DocRecord[]) {
              if (doc.doctype === this.doctype && doc.name.toString() === this.name.toString()) {
                this.doc = this.applyTransform(doc)
                updateRowInListResource(this.doctype, this.doc as DocRecord)
                this.notify()
                break
              }
            }
            onSuccess?.(data?.message)
          },
          ...rest,
        },
        { defer: true },
      )
    }

    for (const child of [
      this.get,
      this.setValue,
      this.setValueDebounced,
      this.save,
      this.delete,
      ...Object.values(this.methods),
    ]) {
      this.forward(child)
    }

    documentRegistry.set(cacheKey, this)
  }

  get hasStarted(): boolean {
    return this.started
  }

  get isDirty(): boolean {
    const cached = this.dirtyCache
    if (cached && cached.doc === this.doc && cached.original === this.originalDoc) return cached.value
    const value = JSON.stringify(this.doc) !== JSON.stringify(this.originalDoc)
    this.dirtyCache = { doc: this.doc, original: this.originalDoc, value }
    return value
  }

  boot(): void {
    if (this.started) return
    this.started = true
    for (const child of [
      this.get,
      this.setValue,
      this.setValueDebounced,
      this.save,
      this.delete,
      ...Object.values(this.methods),
    ]) {
      child.start()
    }
    void getLocal<DocRecord>(this.cacheKey).then((stored) => {
      if ((this.get.loading || !this.get.fetched) && stored) {
        this.doc = this.applyTransform(stored)
        this.notify()
      }
    })
    if (this.auto) void this.get.fetch().catch(() => undefined)
  }

  readonly reload = (): Promise<unknown> => this.get.fetch()

  readonly setDoc = (next: DocRecord | ((current: DocRecord | null) => DocRecord)): void => {
    const doc = typeof next === 'function' ? next(this.doc) : next
    this.doc = this.applyTransform(doc)
    this.notify()
  }

  readonly setField = (key: string, value: unknown): void => {
    this.doc = { ...(this.doc ?? {}), [key]: value }
    this.notify()
  }

  getChangedFields(): DocRecord {
    const doc = clone(this.doc ?? {}) as DocRecord
    const original = this.originalDoc ?? {}
    const values: DocRecord = {}
    for (const key of Object.keys(doc)) {
      if (JSON.stringify(doc[key]) !== JSON.stringify(original[key])) values[key] = doc[key]
    }
    delete values.doctype
    delete values.name
    return values
  }

  private applyTransform(doc: DocRecord): DocRecord {
    if (this.options.transform) {
      const result = this.options.transform(doc)
      if (result && typeof result === 'object') return result
    }
    return doc
  }
}

export function createDocumentResource(
  options: DocumentResourceOptions,
  { defer = false } = {},
): DocumentResource | null {
  if (!(options.doctype && options.name)) return null

  const cacheKey = getCacheKey([options.doctype, options.name]) as string
  const existing = documentRegistry.get(cacheKey)
  if (existing) {
    if (existing.auto && !defer) void existing.reload().catch(() => undefined)
    return existing
  }

  const resource = new DocumentResource(options, cacheKey)
  if (!defer) resource.boot()
  return resource
}
