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
  return base ? `/api/${base}/` : `/api/erpnext/resource/${encodeURIComponent(doctype)}/`
}

function isGenericDoctype(doctype: string): boolean {
  return !getDoctypeEndpoint(doctype)
}

function unwrapData<T>(value: T): T {
  if (value && typeof value === 'object' && 'data' in (value as object)) {
    return (value as Record<string, unknown>).data as T
  }
  return value
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
    case '/api/crm/doc/search-link/':
      return httpJson<T>('POST', url, { body: params, signal })

    case 'frappe.client.get_list': {
      const doctype = asString(params.doctype)
      const generic = isGenericDoctype(doctype)
      const data = await httpJson<ListEnvelope | unknown[]>('GET', endpointFor(doctype), {
        params: generic
          ? {
              fields: params.fields,
              filters: params.filters,
              or_filters: params.or_filters,
              group_by: params.group_by,
              order_by: params.order_by,
              limit_start: params.limit_start || params.start || 0,
              limit_page_length: params.limit_page_length || params.limit || 20,
            }
          : {
              ...filtersToParams(params.filters),
              limit: params.limit_page_length || params.limit || 20,
              offset: params.limit_start || params.start || 0,
              search: params.search || undefined,
              ordering: orderByToOrdering(params.order_by),
            },
        signal,
      })
      const responseData = data as ListEnvelope & { data?: unknown }
      const payload = responseData.results ?? responseData.data ?? data
      return payload as T
    }

    case 'frappe.desk.form.load.getdoctype': {
      const doctype = asString(params.doctype)
      if (!/^F?CRM /.test(doctype)) {
        return httpJson<T>('GET', '/api/erpnext/method/frappe.desk.form.load.getdoctype/', {
          params: { doctype },
          signal,
        })
      }
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
      if (params.doctype !== 'FCRM Settings') {
        return httpJson<T>('GET', '/api/erpnext/method/frappe.client.get_single_value/', { params, signal })
      }
      const data = await httpJson<Record<string, unknown>>('GET', '/api/crm/settings/', { signal })
      return (data?.[asString(params.field)] ?? null) as T
    }

    case 'frappe.client.get_single':
      return httpJson<T>('GET', '/api/erpnext/method/frappe.client.get_single/', { params, signal })

    case 'frappe.client.get': {
      const singleton = SINGLETON_SETTINGS[asString(params.doctype)]
      if (singleton) return httpJson<T>('GET', singleton.read, { signal })
      const response = await httpJson<T>('GET', `${endpointFor(asString(params.doctype))}${encodeURIComponent(asString(params.name))}/`, {
        signal,
      })
      return isGenericDoctype(asString(params.doctype)) ? unwrapData(response) : response
    }

    case 'frappe.client.insert': {
      const { doctype, ...values } = asRecord(params.doc)
      const response = await httpJson<T>('POST', endpointFor(asString(doctype)), { body: stripNulls(values), signal })
      return isGenericDoctype(asString(doctype)) ? unwrapData(response) : response
    }

    case 'frappe.client.save': {
      const { doctype, ...values } = asRecord(params.doc)
      const response = await httpJson<T>('PUT', `${endpointFor(asString(doctype))}${encodeURIComponent(asString(values.name))}/`, {
        body: stripNulls(values),
        signal,
      })
      return isGenericDoctype(asString(doctype)) ? unwrapData(response) : response
    }

    case 'frappe.client.set_value': {
      const body =
        typeof params.fieldname === 'string' ? { [params.fieldname]: params.value } : asRecord(params.fieldname)
      const doctype = asString(params.doctype)
      const singleton = SINGLETON_SETTINGS[doctype]
      if (singleton) return httpJson<T>('PATCH', singleton.write, { body, signal })
      if (!params.name) return httpJson<T>('POST', '/api/erpnext/method/frappe.client.set_value/', { body: params, signal })
      const response = await httpJson<T>('PUT', `${endpointFor(doctype)}${encodeURIComponent(asString(params.name))}/`, {
        body,
        signal,
      })
      return isGenericDoctype(doctype) ? unwrapData(response) : response
    }

    case 'frappe.client.delete': {
      await httpJson('DELETE', `${endpointFor(asString(params.doctype))}${encodeURIComponent(asString(params.name))}/`, { signal })
      return { name: params.name } as T
    }

    case 'run_doc_method': {
      return httpJson<T>('POST', '/api/erpnext/method/run_doc_method/', { body: params, signal })
    }

    case 'frappe.model.mapper.make_mapped_doc': {
      const response = await httpJson<Record<string, unknown>>('POST', '/api/erpnext/method/frappe.model.mapper.make_mapped_doc/', {
        body: params,
        signal,
      })
      return (response.message ?? response.data ?? response) as T
    }
  }

  const path = url.startsWith('/') || url.startsWith('http') ? url : `/api/erpnext/method/${url}/`
  const method = request.method ?? 'GET'
  return method === 'GET' ? httpJson<T>(method, path, { params, signal }) : httpJson<T>(method, path, { body: params, signal })
}

export function call<T = unknown>(method: string, params?: RpcParams, signal?: AbortSignal): Promise<T> {
  return rpc<T>({ url: method, params, method: 'POST', signal })
}
