import { __ } from '@/core/i18n'
import type { DocField } from '../types/meta'

export interface ListFilter {
  field: string
  op: string
  value: string
}

export const FILTER_OPERATORS: Array<{ label: string; value: string }> = [
  { label: 'Equals', value: '=' },
  { label: 'Not Equals', value: '!=' },
  { label: 'Like', value: 'like' },
  { label: 'Not Like', value: 'not like' },
  { label: 'In', value: 'in' },
  { label: 'Not In', value: 'not in' },
  { label: 'Is', value: 'is' },
  { label: '>', value: '>' },
  { label: '<', value: '<' },
  { label: '>=', value: '>=' },
  { label: '<=', value: '<=' },
]

export function selectOptions(field: DocField): Array<{ label: string; value: string }> {
  if (field.fieldtype === 'Check')
    return [
      { label: '', value: '' },
      { label: __('Yes'), value: '1' },
      { label: __('No'), value: '0' },
    ]
  const raw = field.options
  const list = Array.isArray(raw)
    ? raw.map((option) => String((option as { value?: unknown }).value ?? option))
    : String(raw ?? '').split('\n')
  return list.map((option) => ({ label: option ? __(option) : '', value: option }))
}

export function filterable(fields: DocField[]): DocField[] {
  const skip = [
    'Section Break',
    'Column Break',
    'Tab Break',
    'HTML',
    'Button',
    'Table',
    'Table MultiSelect',
    'Image',
    'Fold',
    'Heading',
  ]
  return fields.filter((field) => !skip.includes(field.fieldtype) && field.fieldname)
}

export function toReportviewFilters(doctype: string, filters: ListFilter[]): unknown[] {
  return filters
    .filter((filter) => filter.field && (filter.op === 'is' || String(filter.value ?? '') !== ''))
    .map((filter) => {
      let value: unknown = filter.value
      if (filter.op === 'in' || filter.op === 'not in')
        value = String(filter.value)
          .split(',')
          .map((entry) => entry.trim())
      if (filter.op === 'like' || filter.op === 'not like')
        value = String(filter.value).includes('%') ? filter.value : `%${filter.value}%`
      return [doctype, filter.field, filter.op, value]
    })
}
