import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setConfig } from './config'
import { createDocumentResource } from './documentResource'
import { createListResource } from './listResource'
import { createResource } from './resource'

type Request = { url: string; params?: Record<string, any> }

let fetcher: ReturnType<typeof vi.fn<(request: Request) => Promise<unknown>>>

beforeEach(() => {
  fetcher = vi.fn()
  setConfig('resourceFetcher', fetcher as never)
})

describe('createResource', () => {
  it('fetches automatically and applies transform', async () => {
    fetcher.mockResolvedValue([1, 2, 3])
    const resource = createResource<number, number[]>({
      url: 'test.sum',
      auto: true,
      transform: (values) => values.reduce((total, value) => total + value, 0),
    })
    await resource.promise
    await vi.waitFor(() => expect(resource.fetched).toBe(true))
    expect(resource.data).toBe(6)
    expect(resource.loading).toBe(false)
  })

  it('passes params through makeParams and records them', async () => {
    fetcher.mockResolvedValue('ok')
    const resource = createResource({ url: 'test.params', makeParams: (value: number) => ({ doubled: value * 2 }) })
    await resource.submit(4)
    expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({ url: 'test.params', params: { doubled: 8 } }))
    expect(resource.params).toEqual({ doubled: 8 })
  })

  it('restores previous data and rethrows on error', async () => {
    fetcher.mockResolvedValueOnce('first')
    const onError = vi.fn()
    const resource = createResource<string, string>({ url: 'test.rollback', onError })
    await resource.fetch()
    expect(resource.data).toBe('first')

    const failure = new Error('boom')
    fetcher.mockRejectedValueOnce(failure)
    await expect(resource.fetch()).rejects.toBe(failure)
    expect(resource.data).toBe('first')
    expect(resource.error).toBe(failure)
    expect(onError).toHaveBeenCalledWith(failure)
  })

  it('fails validation before calling the fetcher', async () => {
    const resource = createResource({ url: 'test.validate', validate: () => 'Name is required' })
    await expect(resource.submit({})).rejects.toThrow('Name is required')
    expect(fetcher).not.toHaveBeenCalled()
    expect(resource.error).toBeInstanceOf(Error)
  })

  it('returns the same resource for the same cache key', () => {
    const first = createResource({ url: 'test.cached', cache: 'shared-key' }, { defer: true })
    const second = createResource({ url: 'test.cached', cache: 'shared-key' }, { defer: true })
    expect(second).toBe(first)
  })

  it('notifies subscribers when state changes', async () => {
    fetcher.mockResolvedValue('value')
    const resource = createResource<string, string>({ url: 'test.notify' })
    const listener = vi.fn()
    resource.subscribe(listener)
    const versionBefore = resource.getVersion()
    await resource.fetch()
    expect(listener).toHaveBeenCalled()
    expect(resource.getVersion()).toBeGreaterThan(versionBefore)
  })
})

describe('createListResource', () => {
  const page = (from: number, count: number) =>
    Array.from({ length: count }, (_, index) => ({ name: `row-${from + index}`, title: `Row ${from + index}` }))

  it('loads a page and exposes rows by name', async () => {
    fetcher.mockResolvedValue(page(0, 20))
    const list = createListResource({ doctype: 'CRM Lead', pageLength: 20, auto: true })
    await vi.waitFor(() => expect(list.list.fetched).toBe(true))
    expect(list.data).toHaveLength(20)
    expect(list.getRow('row-3')?.title).toBe('Row 3')
    expect(list.hasNextPage).toBe(true)
    expect(list.hasPreviousPage).toBe(false)
  })

  it('appends the next page and reports the last page', async () => {
    fetcher.mockResolvedValueOnce(page(0, 20)).mockResolvedValueOnce(page(20, 5))
    const list = createListResource({ doctype: 'CRM Deal', pageLength: 20, auto: true })
    await vi.waitFor(() => expect(list.list.fetched).toBe(true))
    list.next()
    await vi.waitFor(() => expect(list.data).toHaveLength(25))
    expect(list.hasNextPage).toBe(false)
    expect(list.hasPreviousPage).toBe(true)
    expect(fetcher.mock.calls[1]?.[0].params).toMatchObject({ limit_start: 20, limit_page_length: 20 })
  })

  it('updates a row in place across list resources of the same doctype', async () => {
    fetcher.mockResolvedValue(page(0, 3))
    const list = createListResource({ doctype: 'Contact', pageLength: 20, auto: true })
    await vi.waitFor(() => expect(list.list.fetched).toBe(true))
    list.applyRowUpdate({ name: 'row-1', title: 'Renamed' })
    expect(list.getRow('row-1')?.title).toBe('Renamed')
  })

  it('removes a row from the list', async () => {
    fetcher.mockResolvedValue(page(0, 3))
    const list = createListResource({ doctype: 'CRM Organization', pageLength: 20, auto: true })
    await vi.waitFor(() => expect(list.list.fetched).toBe(true))
    list.removeRow('row-0')
    expect(list.data.map((row: { name: string }) => row.name)).toEqual(['row-1', 'row-2'])
  })

  it('refetches the list after an insert', async () => {
    fetcher.mockImplementation(async ({ url }) => (url === 'frappe.client.insert' ? { name: 'new' } : page(0, 2)))
    const list = createListResource({ doctype: 'CRM Task', pageLength: 20, auto: true })
    await vi.waitFor(() => expect(list.list.fetched).toBe(true))
    const callsBefore = fetcher.mock.calls.length
    await list.insert.submit({ title: 'Call back' })
    await vi.waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(callsBefore + 1))
    expect(fetcher.mock.calls.some(([request]) => request.url === 'frappe.client.insert')).toBe(true)
  })
})

describe('createDocumentResource', () => {
  it('loads a document and tracks dirty state', async () => {
    fetcher.mockResolvedValue({ name: 'LEAD-1', first_name: 'Ann', status: 'New' })
    const document = createDocumentResource({ doctype: 'CRM Lead', name: 'LEAD-1' })
    await vi.waitFor(() => expect(document?.get.fetched).toBe(true))
    expect(document?.doc).toMatchObject({ first_name: 'Ann' })
    expect(document?.isDirty).toBe(false)
    document?.setField('first_name', 'Anna')
    expect(document?.isDirty).toBe(true)
  })

  it('saves only changed fields and skips the request when nothing changed', async () => {
    fetcher.mockResolvedValueOnce({ name: 'LEAD-2', first_name: 'Bob', status: 'New' })
    const document = createDocumentResource({ doctype: 'CRM Lead', name: 'LEAD-2' })
    await vi.waitFor(() => expect(document?.get.fetched).toBe(true))

    const callsBefore = fetcher.mock.calls.length
    await document?.save.submit()
    expect(fetcher.mock.calls.length).toBe(callsBefore)

    fetcher.mockResolvedValueOnce({ name: 'LEAD-2', first_name: 'Bobby', status: 'New' })
    document?.setField('first_name', 'Bobby')
    await document?.save.submit()
    const saveCall = fetcher.mock.calls[fetcher.mock.calls.length - 1]?.[0]
    expect(saveCall?.url).toBe('frappe.client.set_value')
    expect(saveCall?.params).toEqual({ doctype: 'CRM Lead', name: 'LEAD-2', fieldname: { first_name: 'Bobby' } })
    expect(document?.isDirty).toBe(false)
  })

  it('reverts the document when setValue fails', async () => {
    fetcher.mockResolvedValueOnce({ name: 'LEAD-3', status: 'New' })
    const document = createDocumentResource({ doctype: 'CRM Lead', name: 'LEAD-3' })
    await vi.waitFor(() => expect(document?.get.fetched).toBe(true))

    fetcher.mockRejectedValueOnce(new Error('rejected'))
    await expect(document?.setValue.submit({ status: 'Lost' })).rejects.toThrow('rejected')
    expect(document?.doc?.status).toBe('New')
  })

  it('returns null without a doctype and name', () => {
    expect(createDocumentResource({ doctype: '', name: '' })).toBeNull()
  })
})
