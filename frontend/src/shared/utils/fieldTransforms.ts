import { __ } from '@/core/i18n'
import type { DocField, DocRecord, DocTypeMeta } from '../types/meta'
import { evaluateExpression } from './expressions'

export function parseLinkFilters(linkFilters: unknown): Record<string, unknown> | null {
  if (!linkFilters) return null
  if (typeof linkFilters === 'object') return linkFilters as Record<string, unknown>
  try {
    return JSON.parse(linkFilters as string)
  } catch {
    return null
  }
}

export interface ProcessFieldOptions {
  permOverrides?: Record<string, Partial<DocField>>
  propertyOverrides?: Record<string, Partial<DocField>>
}

export function processField(
  rawField: DocField | null | undefined,
  options: ProcessFieldOptions = {},
): DocField | null {
  if (!rawField) return null

  const { permOverrides = {}, propertyOverrides = {} } = options
  const field: DocField = { ...rawField }

  const perm = permOverrides[field.fieldname]
  if (perm) Object.assign(field, perm)

  const scriptOverride = propertyOverrides[field.fieldname]
  if (scriptOverride) Object.assign(field, scriptOverride)

  if (field.fieldtype === 'Select' && typeof field.options === 'string') {
    const parsed = field.options.split('\n').map((option: string) => ({ label: __(option), value: option }))
    if (parsed[0]?.value !== '' && field.reqd !== 1) parsed.unshift({ label: '', value: '' })
    field.options = parsed
  }

  if (field.fieldtype === 'Link' && field.options === 'User') field.fieldtype = 'User'

  return field
}

export function applyStateFieldOptions(
  field: DocField | null,
  doc: DocRecord | null | undefined,
  doctype: string,
  stateOptionsByCountry?: Record<string, string[]>,
): DocField | null {
  if (!field || doctype !== 'Address' || field.fieldname !== 'state') return field

  const states = stateOptionsByCountry?.[doc?.country]
  if (!states?.length) {
    const hasRegionalStateData = stateOptionsByCountry && Object.keys(stateOptionsByCountry).length > 0
    if (hasRegionalStateData && !doc?.country) {
      return { ...field, placeholder: __('Select Country to see state options') }
    }
    return field
  }

  const current = doc?.state
  const options = current && !states.includes(current) ? [current, ...states] : states
  return { ...field, fieldtype: 'Autocomplete', options }
}

export interface MissingMandatoryOptions {
  propertyOverrides?: Record<string, Partial<DocField>>
  doctypesMeta?: Record<string, DocTypeMeta>
}

export function findMissingMandatory(
  fields: DocField[] | null | undefined,
  doc: DocRecord | null | undefined,
  options: MissingMandatoryOptions = {},
): string[] {
  if (!fields || fields.length === 0) return []
  if (!doc) return []

  const { propertyOverrides = {}, doctypesMeta = {} } = options
  const missing: string[] = []

  for (const df of fields) {
    const overrides = propertyOverrides[df.fieldname] || {}
    const isHidden = overrides.hidden !== undefined ? overrides.hidden : df.hidden
    if (isHidden) continue

    let isRequired: unknown
    if (overrides.reqd !== undefined) {
      isRequired = overrides.reqd
    } else if (df.reqd) {
      isRequired = true
    } else {
      const parent = df.parent ? (doctypesMeta[df.parent] ?? null) : null
      isRequired = evaluateExpression(df.mandatory_depends_on, doc, parent)
    }
    if (!isRequired) continue

    const value = doc[df.fieldname]
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missing.push(df.label || df.fieldname)
    }
  }

  return missing
}
