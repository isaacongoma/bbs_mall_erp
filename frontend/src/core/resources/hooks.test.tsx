import { StrictMode, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setConfig } from './config'
import { useDocumentResource, useListResource, useResource } from './hooks'

type Request = { url: string; params?: Record<string, any> }

let fetcher: ReturnType<typeof vi.fn<(request: Request) => Promise<unknown>>>

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>

beforeEach(() => {
  fetcher = vi.fn()
  setConfig('resourceFetcher', fetcher as never)
})

describe('useResource', () => {
  it('fetches once under StrictMode and re-renders with data', async () => {
    fetcher.mockResolvedValue({ total: 7 })
    const { result } = renderHook(() => useResource<{ total: number }>({ url: 'hook.once', auto: true }), {
      wrapper: strict,
    })
    await waitFor(() => expect(result.current.data).toEqual({ total: 7 }))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.loading).toBe(false)
  })

  it('uses the latest onSuccess callback from the most recent render', async () => {
    fetcher.mockResolvedValue('payload')
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ onSuccess }: { onSuccess: (raw: string) => void }) =>
        useResource<string, string>({ url: 'hook.latest', onSuccess }),
      { initialProps: { onSuccess: first } },
    )
    rerender({ onSuccess: second })
    await act(async () => {
      await result.current.submit({})
    })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('payload')
  })

  it('exposes loading while a request is in flight', async () => {
    let release: (value: string) => void = () => undefined
    fetcher.mockReturnValue(new Promise<string>((resolve) => (release = resolve)))
    const { result } = renderHook(() => useResource<string, string>({ url: 'hook.loading' }))
    let pending: Promise<unknown> | undefined
    act(() => {
      pending = result.current.submit({})
    })
    expect(result.current.loading).toBe(true)
    await act(async () => {
      release('done')
      await pending
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe('done')
  })
})

describe('useListResource', () => {
  it('loads rows automatically and pages forward', async () => {
    const rows = (from: number, count: number) =>
      Array.from({ length: count }, (_, index) => ({ name: `r-${from + index}` }))
    fetcher.mockResolvedValueOnce(rows(0, 10)).mockResolvedValueOnce(rows(10, 3))
    const { result } = renderHook(() => useListResource({ doctype: 'CRM Lead', pageLength: 10, auto: true }), {
      wrapper: strict,
    })
    await waitFor(() => expect(result.current.data).toHaveLength(10))
    act(() => result.current.next())
    await waitFor(() => expect(result.current.data).toHaveLength(13))
    expect(result.current.hasNextPage).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})

describe('useDocumentResource', () => {
  it('loads a document and switches resource when the name changes', async () => {
    fetcher.mockImplementation(async ({ params }) => ({ name: params?.name, title: `Doc ${params?.name}` }))
    const { result, rerender } = renderHook(
      ({ name }: { name: string }) => useDocumentResource({ doctype: 'CRM Deal', name }),
      { initialProps: { name: 'D-1' }, wrapper: strict },
    )
    await waitFor(() => expect(result.current?.doc?.title).toBe('Doc D-1'))

    rerender({ name: 'D-2' })
    await waitFor(() => expect(result.current?.doc?.title).toBe('Doc D-2'))
    expect(result.current?.name).toBe('D-2')
  })

  it('returns null while doctype or name is missing', () => {
    const { result } = renderHook(() => useDocumentResource({ doctype: 'CRM Deal', name: '' }))
    expect(result.current).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('re-renders when a field is edited', async () => {
    fetcher.mockResolvedValue({ name: 'D-9', title: 'Original' })
    const { result } = renderHook(() => useDocumentResource({ doctype: 'CRM Deal', name: 'D-9' }))
    await waitFor(() => expect(result.current?.doc?.title).toBe('Original'))
    act(() => result.current?.setField('title', 'Edited'))
    expect(result.current?.doc?.title).toBe('Edited')
    expect(result.current?.isDirty).toBe(true)
  })
})
