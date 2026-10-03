import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createDocumentResource, type DocumentResource, type DocumentResourceOptions } from './documentResource'
import { createListResource, type ListResource, type ListResourceOptions } from './listResource'
import type { Observable } from './observable'
import { createResource, type Resource, type ResourceOptions } from './resource'

type AnyFunction = (...args: any[]) => any

const noopSource = {
  subscribe: () => () => undefined,
  getVersion: () => 0,
}

function useLatest<T>(value: T): () => T {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return useCallback(() => ref.current, [])
}

function withLatestCallbacks<T extends object>(initialOptions: T, getLatest: () => T): T {
  const initial = initialOptions as Record<string, unknown>
  const wrapped: Record<string, unknown> = {}

  for (const key of Object.keys(initial)) {
    const value = initial[key]
    if (typeof value === 'function') {
      wrapped[key] = (...args: unknown[]) => {
        const current = (getLatest() as Record<string, unknown>)[key]
        return typeof current === 'function' ? (current as AnyFunction)(...args) : undefined
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>
      const nestedWrapped: Record<string, unknown> = { ...nested }
      for (const nestedKey of Object.keys(nested)) {
        if (typeof nested[nestedKey] !== 'function') continue
        nestedWrapped[nestedKey] = (...args: unknown[]) => {
          const parent = (getLatest() as Record<string, unknown>)[key] as Record<string, unknown> | undefined
          const current = parent?.[nestedKey]
          return typeof current === 'function' ? (current as AnyFunction)(...args) : undefined
        }
      }
      wrapped[key] = nestedWrapped
    } else {
      wrapped[key] = value
    }
  }

  return wrapped as T
}

export function useObservable<T extends Observable>(source: T): T {
  useSyncExternalStore(source.subscribe, source.getVersion, source.getVersion)
  return source
}

export function useResource<TData = any, TRaw = any>(options: ResourceOptions<TData, TRaw>): Resource<TData, TRaw> {
  const getLatest = useLatest(options)
  const [resource] = useState(() => createResource(withLatestCallbacks(options, getLatest), { defer: true }))

  useEffect(() => {
    if (resource.hasStarted) {
      if (resource.auto) void resource.reload().catch(() => undefined)
    } else {
      resource.start()
    }
  }, [resource])

  return useObservable(resource)
}

export function useListResource(options: ListResourceOptions): ListResource {
  const getLatest = useLatest(options)
  const [resource] = useState(() => createListResource(withLatestCallbacks(options, getLatest), { defer: true }))

  useEffect(() => {
    if (resource.hasStarted) {
      if (resource.auto) resource.fetch()
    } else {
      resource.boot()
    }
  }, [resource])

  return useObservable(resource)
}

export function useDocumentResource(options: DocumentResourceOptions): DocumentResource | null {
  const getLatest = useLatest(options)
  const { doctype, name } = options
  const key = `${doctype}::${name}`
  const build = () =>
    doctype && name ? createDocumentResource(withLatestCallbacks(options, getLatest), { defer: true }) : null
  const [entry, setEntry] = useState(() => ({ key, resource: build() }))
  let resource = entry.resource
  if (entry.key !== key) {
    resource = build()
    setEntry({ key, resource })
  }

  useEffect(() => {
    if (!resource) return
    if (resource.hasStarted) {
      if (resource.auto) void resource.reload().catch(() => undefined)
    } else {
      resource.boot()
    }
  }, [resource])

  useSyncExternalStore(
    resource ? resource.subscribe : noopSource.subscribe,
    resource ? resource.getVersion : noopSource.getVersion,
    resource ? resource.getVersion : noopSource.getVersion,
  )
  return resource
}
