import { makeHrmsResource, messageTransform, useHrmsQuery } from './resource'
import type { HrmsEmployee, HrmsRequest } from '../types'

const resources = new Map<string, ReturnType<typeof makeHrmsResource<unknown>>>()

function getResource(doctype: string) {
  const existing = resources.get(doctype)
  if (existing) return existing
  const resource = makeHrmsResource<unknown>('frappe.client.get_list', `hrms:list:${doctype}`)
  resources.set(doctype, resource)
  return resource
}

export function useHrmsDocumentList(
  doctype: string,
  employee: HrmsEmployee | null,
  filters: Record<string, unknown> = {},
  scope: 'mine' | 'team' = 'mine',
) {
  const resource = useHrmsQuery(
    getResource(doctype),
    employee?.name
      ? {
          doctype,
          fields: ['*'],
          filters: { ...(scope === 'mine' ? { employee: employee.name } : {}), ...filters },
          limit_page_length: 50,
          order_by: doctype === 'Employee Checkin' ? 'time desc' : 'creation desc',
        }
      : null,
    Boolean(employee?.name),
  )
  const documents = resource.data ? messageTransform<HrmsRequest[]>(resource.data) : []
  return { resource, documents: documents.map((document) => ({ ...document, doctype })) }
}
