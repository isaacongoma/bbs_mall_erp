import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { createResource, type Resource } from '@/core/resources'
import { unwrapMessage } from '../api/response'

export function makeHrmsResource<T>(url: string, cache?: string): Resource<T> {
  return createResource<T>({ url, cache, auto: false })
}

export function useHrmsResource<T>(resource: Resource<T>, enabled = true): Resource<T> {
  useSyncExternalStore(resource.subscribe, resource.getVersion, resource.getVersion)

  useEffect(() => {
    if (!enabled) return
    resource.start()
    if (!resource.fetched && !resource.loading) void resource.fetch()
  }, [enabled, resource])

  return resource
}

export function useHrmsQuery<T>(
  resource: Resource<T>,
  params: Record<string, unknown> | null,
  enabled = true,
): Resource<T> {
  useHrmsResource(resource, false)
  const paramsKey = useMemo(() => JSON.stringify(params), [params])
  const stableParams = useMemo<Record<string, unknown> | null>(
    () => (paramsKey === 'null' ? null : (JSON.parse(paramsKey) as Record<string, unknown>)),
    [paramsKey],
  )

  useEffect(() => {
    if (!enabled) return
    resource.start()
    void resource.fetch(stableParams ?? undefined).catch(() => undefined)
  }, [enabled, paramsKey, resource, stableParams])

  return resource
}

export function messageTransform<T>(value: unknown): T {
  return unwrapMessage<T>(value)
}
