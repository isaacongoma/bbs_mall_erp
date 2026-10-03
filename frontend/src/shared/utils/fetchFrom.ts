import type { DocField } from '../types/meta'

export interface FetchSource {
  link: string
  source: string
}

export function getFetchSource(fetchFrom: unknown): FetchSource | null {
  if (typeof fetchFrom !== 'string') return null
  const parts = fetchFrom.split('.')
  if (parts.length < 2) return null
  const link = parts[0]
  const source = parts[parts.length - 1]
  if (!link || !source) return null
  return { link, source }
}

export function getFieldsToFetch(fields: DocField[], linkFieldname: string): DocField[] {
  return fields.filter((field) => getFetchSource(field.fetch_from)?.link === linkFieldname)
}

export function getPendingFetchFields(
  fields: DocField[],
  linkFieldname: string,
  doc: Record<string, unknown>,
): DocField[] {
  return getFieldsToFetch(fields, linkFieldname).filter((field) => !(field.fetch_if_empty && doc[field.fieldname]))
}

export function getSourceFieldnames(fields: DocField[]): string[] {
  return [...new Set(fields.map((field) => getFetchSource(field.fetch_from)?.source ?? ''))].filter(Boolean)
}

export function isFetchedFromLink(field: DocField, doc: Record<string, unknown>): boolean {
  const link = getFetchSource(field.fetch_from)?.link
  return Boolean(link && doc[link])
}
