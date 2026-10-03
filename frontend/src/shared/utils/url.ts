import { __ } from '@/core/i18n'
import { toast } from '@/design-system'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function getSafeWebsiteUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  const toParse = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(toParse)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null
    return parsed.href
  } catch {
    return null
  }
}

export function openWebsite(url: string | null | undefined): boolean {
  const safeUrl = getSafeWebsiteUrl(url)
  if (!safeUrl) {
    toast.error(__('Invalid Website URL'))
    return false
  }
  window.open(safeUrl, '_blank', 'noopener')
  return true
}

export function website(url: string | null | undefined): string | null | undefined {
  return url && url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
}
