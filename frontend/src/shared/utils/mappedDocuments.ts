import { call } from '@/core/api/rpc'
import { getDocumentBundle, type CrmDocument } from '../data/document'
import type { DocRecord } from '../types/meta'

export interface MappedDocumentRequest {
  method: string
  sourceName: string
  args?: Record<string, unknown> | null
  selectedChildren?: Record<string, unknown> | null
}

export async function createMappedDocument(request: MappedDocumentRequest): Promise<DocRecord | null> {
  const mapped = await call<DocRecord>('frappe.model.mapper.make_mapped_doc', {
    method: request.method,
    source_name: request.sourceName,
    args: request.args ?? null,
    selected_children: request.selectedChildren ?? null,
  })
  if (!mapped?.doctype) return null
  const bundle = getDocumentBundle(String(mapped.doctype), '')
  const document = bundle.document as CrmDocument
  if ('setDoc' in document && typeof document.setDoc === 'function') document.setDoc(mapped)
  return mapped
}
