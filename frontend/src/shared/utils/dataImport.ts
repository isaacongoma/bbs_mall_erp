import { rpc } from '@/core/api/rpc'
import { useAuthStore } from '@/core/auth/authStore'
import { toast } from '@/design-system'
import type { DocField } from '../types/meta'

type AnyRecord = Record<string, any>

export type DataImportStatus = 'Pending' | 'Success' | 'Partial Success' | 'Error' | 'Timed Out'
export type DataImportStep = 'list' | 'upload' | 'map' | 'preview'

export interface DataImportRecord {
  name?: string
  reference_doctype: string
  import_type: string
  status: DataImportStatus
  creation?: string
  mute_emails: boolean
  import_file?: string
  google_sheets_url?: string
  template_options?: string
}

export interface DoctypeMapEntry {
  title: string
  listRoute?: string
  pageRoute?: string
}

export type DoctypeMap = Record<string, DoctypeMapEntry>

export interface DoctypeOption {
  value: string
  label: string
}

export const IMPORT_STATUSES: DataImportStatus[] = ['Pending', 'Success', 'Partial Success', 'Error', 'Timed Out']

export const FIELDS_TO_IGNORE = [
  'Section Break',
  'Column Break',
  'Tab Break',
  'HTML',
  'Table',
  'Table MultiSelect',
  'Button',
  'Image',
  'Fold',
  'Heading',
]

export function getBadgeColor(status: DataImportStatus): 'orange' | 'green' | 'red' | 'gray' {
  const colors: Record<string, 'orange' | 'green' | 'red'> = {
    Pending: 'orange',
    Success: 'green',
    'Partial Success': 'orange',
    Error: 'red',
    'Timed Out': 'orange',
  }
  return colors[status] ?? 'gray'
}

export function parseTemplateOptions(options?: string): AnyRecord {
  if (!options) return {}
  try {
    return JSON.parse(options) ?? {}
  } catch {
    return {}
  }
}

export function importableFields(fields: DocField[]): DocField[] {
  return fields.filter((field) => !FIELDS_TO_IGNORE.includes(field.fieldtype))
}

export function mandatoryExportFields(doctype: string, fields: DocField[]): Record<string, string[]> {
  const mandatory = importableFields(fields)
    .filter((field) => field.reqd)
    .map((field) => field.fieldname)
  return { [doctype]: ['name', ...mandatory] }
}

export function allExportFields(doctype: string, fields: DocField[]): Record<string, string[]> {
  return { [doctype]: ['name', ...importableFields(fields).map((field) => field.fieldname)] }
}

export function getPreviewData(importName: string, file?: string, sheet?: string): Promise<AnyRecord | undefined> {
  return rpc<AnyRecord>({
    url: 'frappe.core.doctype.data_import.data_import.get_preview_from_template',
    params: { data_import: importName, import_file: file, google_sheets_url: sheet },
  }).catch((error: { messages?: string[]; message?: string }) => {
    toast.error(error.messages?.[0] ?? error.message ?? String(error))
    return undefined
  })
}

export async function downloadTemplate(doctype: string, exportFields: Record<string, string[]>): Promise<void> {
  const query = new URLSearchParams({ doctype, export_fields: JSON.stringify(exportFields), file_type: 'CSV' })
  const token = useAuthStore.getState().access
  const response = await fetch(`/api/crm/data-imports/template/?${query.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    toast.error(`Could not download the template (${response.status})`)
    return
  }
  const blob = await response.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${doctype}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
