import { isTranslatableDoctype } from '@/core/boot'

const STORAGE_KEYS = ['_last_load', '_version_number', 'metadata_version', 'page_info', 'last_visited']
const STORAGE_PREFIXES = ['_page:', '_doctype:', 'preferred_breadcrumbs:']

export function clearCache(): void {
  STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
  for (const key of Object.keys(localStorage)) {
    if (STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key)
  }
}

export function isTranslatable(doctype: string): boolean {
  return isTranslatableDoctype(doctype)
}
