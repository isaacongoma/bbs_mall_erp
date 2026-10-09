import { httpJson } from '@/core/api/http'

type AnyRecord = Record<string, any>

export function methodUrl(method: string): string {
  return `/api/erpnext/method/${method}/`
}

export async function callMethod(
  method: string,
  args: AnyRecord = {},
  type: 'GET' | 'POST' = 'POST',
): Promise<AnyRecord> {
  const url = methodUrl(method)
  return type === 'GET'
    ? httpJson<AnyRecord>('GET', url, { params: args })
    : httpJson<AnyRecord>('POST', url, { body: args })
}
