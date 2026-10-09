import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../auth/authStore'
import { rpc } from './rpc'

describe('generic ERP RPC transport', () => {
  beforeEach(() => {
    useAuthStore.setState({ access: null, refresh: null })
  })

  it('loads unregistered doctypes through the generic resource endpoint', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ name: 'SINV-1', customer: 'Customer' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    const result = await rpc({
      url: 'frappe.client.get_list',
      params: {
        doctype: 'Sales Invoice',
        fields: ['name', 'customer'],
        filters: { status: 'Paid' },
        order_by: 'modified desc',
      },
    })

    expect(result).toEqual([{ name: 'SINV-1', customer: 'Customer' }])
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/api/erpnext/resource/Sales%20Invoice/')
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('filters=%7B%22status%22%3A%22Paid%22%7D')
  })

  it('unwraps generic resource documents and inserts', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { name: 'SINV-1', customer: 'Customer' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { name: 'SINV-2', customer: 'Another' } }), { status: 201 }))
    vi.stubGlobal('fetch', fetcher)

    await expect(rpc({ url: 'frappe.client.get', params: { doctype: 'Sales Invoice', name: 'SINV-1' } })).resolves.toEqual({
      name: 'SINV-1',
      customer: 'Customer',
    })
    await expect(rpc({ url: 'frappe.client.insert', params: { doc: { doctype: 'Sales Invoice', customer: 'Another' } } })).resolves.toEqual({
      name: 'SINV-2',
      customer: 'Another',
    })
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' })
  })

  it('uses Frappe methods for singleton settings', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: { allow_geolocation_tracking: 1 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: { ok: true } }), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)

    await rpc({ url: 'frappe.client.get_single', params: { doctype: 'HR Settings' } })
    await rpc({ url: 'frappe.client.set_value', method: 'POST', params: { doctype: 'HR Settings', fieldname: { allow_geolocation_tracking: 0 } } })
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/api/erpnext/method/frappe.client.get_single/')
    expect(String(fetcher.mock.calls[1]?.[0])).toContain('/api/erpnext/method/frappe.client.set_value/')
  })

  it('runs whitelisted document methods through the method endpoint', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: { status: 'ok' } }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetcher)

    await expect(
      rpc({
        url: 'run_doc_method',
        method: 'POST',
        params: { dt: 'Payroll Entry', dn: 'HR-PRUN-2026-00001', method: 'fill_employee_details', args: {} },
      }),
    ).resolves.toEqual({ message: { status: 'ok' } })
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/api/erpnext/method/run_doc_method/')
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      dt: 'Payroll Entry',
      dn: 'HR-PRUN-2026-00001',
      method: 'fill_employee_details',
    })
  })

  it('sends raw POST RPC parameters in the request body', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([{ value: 'EMP-0001' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)

    await rpc({ url: '/api/crm/doc/search-link/', method: 'POST', params: { doctype: 'Employee', txt: 'EMP', page_length: 20 } })

    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ doctype: 'Employee', txt: 'EMP', page_length: 20 })
  })

  it('unwraps mapped document responses from the method endpoint', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: { doctype: 'Employee', employee_name: 'Mapped Applicant' } }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetcher)

    await expect(
      rpc({
        url: 'frappe.model.mapper.make_mapped_doc',
        method: 'POST',
        params: { method: 'hrms.hr.doctype.job_applicant.job_applicant.make_employee', source_name: 'applicant@example.com' },
      }),
    ).resolves.toEqual({ doctype: 'Employee', employee_name: 'Mapped Applicant' })
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/api/erpnext/method/frappe.model.mapper.make_mapped_doc/')
  })
})
