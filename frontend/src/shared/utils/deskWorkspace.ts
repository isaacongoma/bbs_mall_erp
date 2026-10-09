export type DeskWorkspace = Record<string, any>

export function unwrapDeskResponse(value: unknown): any {
  if (value && typeof value === 'object' && 'message' in (value as object)) {
    const message = (value as DeskWorkspace).message
    if (message !== undefined) return message
  }
  return value
}

export function workspacePages(value: unknown): DeskWorkspace[] {
  const payload = unwrapDeskResponse(value)
  const pages = payload && typeof payload === 'object' && 'pages' in payload ? (payload as DeskWorkspace).pages : payload
  return Array.isArray(pages) ? pages.filter((page): page is DeskWorkspace => Boolean(page && typeof page === 'object')) : []
}

export function workspaceName(page: DeskWorkspace): string {
  return String(page.name ?? page.title ?? page.label ?? '')
}

export function findWorkspace(pages: DeskWorkspace[], value: string): DeskWorkspace | null {
  const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, '-')
  const normalized = normalize(value)
  return pages.find((page) => normalize(workspaceName(page)) === normalized || normalize(String(page.title ?? '')) === normalized) ?? null
}

export function parseWorkspaceBlocks(content: unknown): DeskWorkspace[] {
  if (Array.isArray(content)) return content.filter((block): block is DeskWorkspace => Boolean(block && typeof block === 'object'))
  if (typeof content !== 'string' || !content.trim()) return []
  try {
    const parsed = JSON.parse(content) as unknown
    return Array.isArray(parsed) ? parsed.filter((block): block is DeskWorkspace => Boolean(block && typeof block === 'object')) : []
  } catch {
    return []
  }
}

export function workspaceItems(value: unknown): DeskWorkspace[] {
  const payload = unwrapDeskResponse(value)
  if (Array.isArray(payload)) return payload.filter((item): item is DeskWorkspace => Boolean(item && typeof item === 'object'))
  if (payload && typeof payload === 'object' && 'items' in payload) {
    const items = (payload as DeskWorkspace).items
    return Array.isArray(items) ? items.filter((item): item is DeskWorkspace => Boolean(item && typeof item === 'object')) : []
  }
  return []
}
