export interface SafeUrlOptions {
  allowedSchemes?: string[]
  base?: string
}

const DEFAULT_SCHEMES: readonly string[] = ['http', 'https']

function normalizeScheme(scheme: string): string {
  return scheme.toLowerCase().replace(/:$/, '')
}

export function isSafeUrl(url: string, options?: SafeUrlOptions): boolean {
  if (typeof url !== 'string' || url.trim() === '') return false

  const allowedSchemes = (options?.allowedSchemes ?? DEFAULT_SCHEMES).map(normalizeScheme)

  let parsed: URL
  try {
    parsed = new URL(url, options?.base)
  } catch {
    return false
  }

  const scheme = normalizeScheme(parsed.protocol)
  return allowedSchemes.includes(scheme)
}

export function matchesHostname(host: string, allowlist: readonly string[]): boolean {
  if (!host) return false
  const normalizedHost = host.toLowerCase()

  return allowlist.some((entry) => {
    const normalizedEntry = entry.toLowerCase().replace(/^\.+/, '')
    if (!normalizedEntry) return false
    return normalizedHost === normalizedEntry || normalizedHost.endsWith('.' + normalizedEntry)
  })
}
