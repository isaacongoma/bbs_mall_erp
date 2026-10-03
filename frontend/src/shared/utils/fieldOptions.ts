import { __ } from '@/core/i18n'
import { dayjs } from '@/core/datetime'
import { flt } from './numberFormat'

export interface FieldOption {
  label: string
  value: string
}

export const READ_ONLY_EXCLUDED_FIELD_TYPES = [
  'Int',
  'Float',
  'Currency',
  'Percent',
  'Check',
  'Duration',
  'Rating',
  'Button',
  'Attach',
  'Attach Image',
  'HTML',
  'Geolocation',
  'Text Editor',
]

export const GRID_RESTRICTED_FIELD_TYPES = [
  'Section Break',
  'Column Break',
  'Tab Break',
  'Table',
  'Table MultiSelect',
  'Image',
]

export function getOptions(options: unknown): Array<FieldOption | string> {
  if (Array.isArray(options)) return options as Array<FieldOption | string>
  if (typeof options === 'string') {
    return options.split('\n').map((option) => ({ label: __(option), value: option }))
  }
  return []
}

export function normalizeFieldValue(value: unknown): unknown {
  if (Array.isArray(value)) return value
  if (typeof value === 'object' && value !== null && 'value' in value) return (value as { value: unknown }).value
  return value
}

export function getDefaultValue(defaultValue: any, fieldtype: string): unknown {
  if (['Float', 'Currency', 'Percent'].includes(fieldtype)) return flt(defaultValue)
  if (fieldtype === 'Check') {
    if (['1', 'true', 'True'].includes(defaultValue)) return true
    if (['0', 'false', 'False'].includes(defaultValue)) return false
  } else if (fieldtype === 'Int') {
    return parseInt(defaultValue)
  } else if (defaultValue === 'Today' && fieldtype === 'Date') {
    return dayjs().format('YYYY-MM-DD')
  } else if (['Now', 'now'].includes(defaultValue) && fieldtype === 'Datetime') {
    return dayjs().format('YYYY-MM-DD HH:mm:ss')
  } else if (['Now', 'now'].includes(defaultValue) && fieldtype === 'Time') {
    return dayjs().format('HH:mm:ss')
  } else if (fieldtype === 'Date') {
    return dayjs(defaultValue).format('YYYY-MM-DD')
  } else if (fieldtype === 'Datetime') {
    return dayjs(defaultValue).format('YYYY-MM-DD HH:mm:ss')
  } else if (fieldtype === 'Time') {
    return dayjs(defaultValue).format('HH:mm:ss')
  }
  return defaultValue
}
