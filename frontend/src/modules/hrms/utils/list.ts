import type { HrmsRequest } from '../types'

export function formatHrmsListField(document: HrmsRequest, field: string): string {
  const value = document[field]
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? '' : String(value)
}

export function filterHrmsDocuments(
  documents: HrmsRequest[],
  fields: string[],
  query: string,
  filters: Record<string, string>,
): HrmsRequest[] {
  const normalizedQuery = query.trim().toLowerCase()
  return documents.filter((document) => {
    const matchesSearch =
      !normalizedQuery ||
      fields.some((field) => formatHrmsListField(document, field).toLowerCase().includes(normalizedQuery))
    const matchesFilters = Object.entries(filters).every(
      ([field, value]) => !value || formatHrmsListField(document, field) === value,
    )
    return matchesSearch && matchesFilters
  })
}
