import type { HttpMethod } from './http'

export interface MethodEndpoint {
  path: string
  method: HttpMethod
}

export interface ModuleEndpoints {
  doctypes?: Readonly<Record<string, string>>
  methods?: Readonly<Record<string, MethodEndpoint>>
}

const doctypeEndpoints = new Map<string, string>()
const methodEndpoints = new Map<string, MethodEndpoint>()

export function registerEndpoints({ doctypes = {}, methods = {} }: ModuleEndpoints): void {
  for (const [doctype, base] of Object.entries(doctypes)) doctypeEndpoints.set(doctype, base)
  for (const [name, endpoint] of Object.entries(methods)) methodEndpoints.set(name, endpoint)
}

export function getDoctypeEndpoint(doctype: string): string | undefined {
  return doctypeEndpoints.get(doctype)
}

export function getMethodEndpoint(method: string): MethodEndpoint | undefined {
  return methodEndpoints.get(method)
}

export const get = (path: string): MethodEndpoint => ({ path, method: 'GET' })
export const post = (path: string): MethodEndpoint => ({ path, method: 'POST' })
