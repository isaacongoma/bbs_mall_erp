import { getDoctypeEndpoint, getMethodEndpoint } from './endpointRegistry'
import { httpJson, type HttpMethod } from './http'

export type RpcParams = Record<string, unknown>

export interface RpcRequest {
  url: string
  params?: RpcParams
  method?: HttpMethod
  signal?: AbortSignal
}

interface ListEnvelope {
  results?: unknown
}

function endpointFor(doctype: string): string {
  const base = getDoctypeEndpoint(doctype)
  if (!base) throw new Error(`No REST endpoint mapped for doctype "${doctype}"`)
  return `/api/${base}/`
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function filtersToParams(filters: unknown): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (!filters) return params
  if (Array.isArray(filters)) {
    for (const filter of filters) {
      if (Array.isArray(filter) && filter.length >= 3) params[asString(filter[0])] = filter[2]
    }
  } else if (typeof filters === 'object') {
    for (const [key, value] of Object.entries(filters)) {
      params[key] = Array.isArray(value) ? value[value.length - 1] : value
    }
  }
  return params
}

export function stripNulls(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== null) result[key] = value
  }
  return result
}

export function orderByToOrdering(orderBy: unknown): string | undefined {
  if (!orderBy || typeof orderBy !== 'string') return undefined
  const [field, direction] = orderBy.trim().split(/\s+/)
  if (!field) return undefined
  return direction?.toLowerCase() === 'desc' ? `-${field}` : field
}

const SINGLETON_SETTINGS: Readonly<Record<string, { read: string; write: string }>> = {
  'FCRM Settings': { read: '/api/crm/settings/', write: '/api/crm/settings/update/' },
  'System Settings': { read: '/api/crm/system-settings/', write: '/api/crm/system-settings/update/' },
  'CRM Twilio Settings': {
    read: '/api/crm/integrations/twilio/settings/',
    write: '/api/crm/integrations/twilio/settings/',
  },
  'CRM Exotel Settings': {
    read: '/api/crm/integrations/exotel/settings/',
    write: '/api/crm/integrations/exotel/settings/',
  },
}

export async function rpc<T = unknown>(request: RpcRequest): Promise<T> {
  const { url, signal } = request
  const params = request.params ?? {}

  const mapped = getMethodEndpoint(url)
  if (mapped) {
    return (
      mapped.method === 'GET'
        ? httpJson(mapped.method, mapped.path, { params, signal })
        : httpJson(mapped.method, mapped.path, { body: params, signal })
    ) as Promise<T>
  }

  switch (url) {
    case 'frappe.client.get_list': {
      const data = await httpJson<ListEnvelope | unknown[]>('GET', endpointFor(asString(params.doctype)), {
        params: {
          ...filtersToParams(params.filters),
          limit: params.limit_page_length || params.limit || 20,
          offset: params.limit_start || params.start || 0,
          search: params.search || undefined,
          ordering: orderByToOrdering(params.order_by),
        },
        signal,
      })
      return ((data as ListEnvelope).results ?? data) as T
    }

    case 'frappe.desk.form.load.getdoctype': {
      const doctype = asString(params.doctype)
      const meta = await httpJson<Record<string, unknown>>('GET', `/api/meta/${encodeURIComponent(doctype)}/`, {
        signal,
      })
      return {
        docs: [{ name: doctype, doctype: 'DocType', translated_doctype: false, ...meta }],
        user_settings: '{}',
      } as T
    }

    case 'frappe.model.utils.user_settings.save':
      return null as T

    case 'crm.fcrm.doctype.crm_lead.crm_lead.convert_to_deal':
      return httpJson<T>('POST', `/api/crm/leads/${encodeURIComponent(asString(params.lead))}/convert-to-deal/`, {
        signal,
      })

    case 'crm.fcrm.doctype.crm_deal.api.get_deal_contacts':
      return httpJson<T>('GET', `/api/crm/deals/${encodeURIComponent(asString(params.name))}/contacts/`, { signal })

    case 'crm.fcrm.doctype.crm_call_log.crm_call_log.get_call_log':
      return httpJson<T>('GET', `/api/crm/call-logs/${encodeURIComponent(asString(params.name))}/detail/`, {
        signal,
      })

    case 'crm.fcrm.doctype.crm_call_log.crm_call_log.create_lead_from_call_log': {
      const callLog = params.call_log
      const callLogName = typeof callLog === 'object' ? asString(asRecord(callLog).name) : asString(callLog)
      return httpJson<T>('POST', `/api/crm/call-logs/${encodeURIComponent(callLogName)}/create-lead/`, {
        body: { lead_details: params.lead_details },
        signal,
      })
    }

    case 'frappe.client.get_single_value': {
      if (params.doctype !== 'FCRM Settings') return null as T
      const data = await httpJson<Record<string, unknown>>('GET', '/api/crm/settings/', { signal })
      return (data?.[asString(params.field)] ?? null) as T
    }

    case 'frappe.client.get': {
      const singleton = SINGLETON_SETTINGS[asString(params.doctype)]
      if (singleton) return httpJson<T>('GET', singleton.read, { signal })
      return httpJson<T>('GET', `${endpointFor(asString(params.doctype))}${asString(params.name)}/`, { signal })
    }

    case 'frappe.client.insert': {
      const { doctype, ...values } = asRecord(params.doc)
      return httpJson<T>('POST', endpointFor(asString(doctype)), { body: stripNulls(values), signal })
    }

    case 'frappe.client.save': {
      const { doctype, ...values } = asRecord(params.doc)
      return httpJson<T>('PUT', `${endpointFor(asString(doctype))}${asString(values.name)}/`, {
        body: stripNulls(values),
        signal,
      })
    }

    case 'frappe.client.set_value': {
      const body =
        typeof params.fieldname === 'string' ? { [params.fieldname]: params.value } : asRecord(params.fieldname)
      const doctype = asString(params.doctype)
      const singleton = SINGLETON_SETTINGS[doctype]
      if (singleton) return httpJson<T>('PATCH', singleton.write, { body, signal })
      return httpJson<T>('PATCH', `${endpointFor(doctype)}${asString(params.name)}/`, { body, signal })
    }

    case 'frappe.client.delete': {
      await httpJson('DELETE', `${endpointFor(asString(params.doctype))}${asString(params.name)}/`, { signal })
      return { name: params.name } as T
    }

    case 'run_doc_method': {
      const actionPath = asString(params.method).replace(/_/g, '-')
      return httpJson<T>('POST', `${endpointFor(asString(params.dt))}${asString(params.dn)}/${actionPath}/`, {
        body: params.args,
        signal,
      })
    }
  }

  const path = url.startsWith('/') || url.startsWith('http') ? url : `/api/crm/${url}`
  return httpJson<T>(request.method ?? 'GET', path, { params, signal })
}

export function call<T = unknown>(method: string, params?: RpcParams, signal?: AbortSignal): Promise<T> {
  return rpc<T>({ url: method, params, method: 'POST', signal })
}
