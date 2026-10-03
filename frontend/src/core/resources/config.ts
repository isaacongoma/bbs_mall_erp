import type { RpcRequest } from '@/core/api/rpc'

export interface ResourceConfig {
  systemTimezone: string | null
  localTimezone: string | null
  translatedMessages: Record<string, string>
  resourceFetcher: ((request: RpcRequest) => Promise<unknown>) | null
  fallbackErrorHandler: ((error: unknown) => void) | null
  defaultListUrl: string
  defaultDocGetUrl: string
  defaultDocInsertUrl: string
  defaultDocUpdateUrl: string
  defaultDocDeleteUrl: string
  defaultRunDocMethodUrl: string
}

const config: ResourceConfig = {
  systemTimezone: null,
  localTimezone: null,
  translatedMessages: {},
  resourceFetcher: null,
  fallbackErrorHandler: null,
  defaultListUrl: 'frappe.client.get_list',
  defaultDocGetUrl: 'frappe.client.get',
  defaultDocInsertUrl: 'frappe.client.insert',
  defaultDocUpdateUrl: 'frappe.client.set_value',
  defaultDocDeleteUrl: 'frappe.client.delete',
  defaultRunDocMethodUrl: 'run_doc_method',
}

export function setConfig<K extends keyof ResourceConfig>(key: K, value: ResourceConfig[K]): void {
  config[key] = value
}

export function getConfig<K extends keyof ResourceConfig>(key: K): ResourceConfig[K] {
  return config[key]
}
