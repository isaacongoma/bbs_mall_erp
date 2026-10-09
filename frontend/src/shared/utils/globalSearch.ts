export type SearchScope = 'records' | 'reports' | 'pages'

export interface SearchResultItem {
  value: string
  label?: string
  description?: string | null
}

export interface RecentSearchItem extends SearchResultItem {
  scope: SearchScope
  doctype?: string
}

export function readRecentSearches(storage: Storage | undefined): RecentSearchItem[] {
  if (!storage) return []
  try {
    const value = JSON.parse(storage.getItem('desk-global-search-recent') ?? '[]')
    if (!Array.isArray(value)) return []
    return value
      .filter((item): item is SearchResultItem & Partial<RecentSearchItem> => item && typeof item === 'object' && typeof item.value === 'string')
      .map((item) => ({ ...item, scope: item.scope ?? 'records' }))
      .slice(0, 8)
  } catch {
    return []
  }
}

export function addRecentSearch(
  recent: RecentSearchItem[],
  result: SearchResultItem,
  scope: SearchScope,
  doctype?: string,
): RecentSearchItem[] {
  const item = { ...result, scope, ...(doctype ? { doctype } : {}) }
  return [item, ...recent.filter((entry) => !(entry.value === result.value && entry.scope === scope && entry.doctype === doctype))].slice(0, 8)
}

export function searchResultPath(result: RecentSearchItem, currentDoctype?: string): string {
  if (result.scope === 'reports') return `/app/query-report/${encodeURIComponent(result.value)}`
  if (result.scope === 'pages') return `/app/${encodeURIComponent(result.value)}`
  const targetDoctype = result.doctype || currentDoctype || 'Employee'
  return `/app/${encodeURIComponent(targetDoctype)}/${encodeURIComponent(result.value)}`
}
