const RESERVED = new Set(['query-report', 'dashboard-view', 'notifications', 'data-import'])

export interface RouteKnowledge {
  doctypes: string[]
  shellOfDoctype: Record<string, string>
  shells: string[]
}

let doctypeBySlug = new Map<string, string>()
let shellOfDoctype: Record<string, string> = {}
let shellSlugs = new Set<string>()
let ready = false
const listeners = new Set<() => void>()

export function slugSegment(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-')
}

export function setRouteKnowledge(knowledge: RouteKnowledge): void {
  doctypeBySlug = new Map(knowledge.doctypes.map((name) => [slugSegment(name), name]))
  shellOfDoctype = knowledge.shellOfDoctype
  shellSlugs = new Set(knowledge.shells.map(slugSegment))
  ready = true
  listeners.forEach((listener) => listener())
}

export function routeKnowledgeReady(): boolean {
  return ready
}

export function subscribeRouteKnowledge(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function doctypeForSlug(slug: string): string | undefined {
  return doctypeBySlug.get(slug)
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function segments(path: string): string[] {
  return path.split('/').filter(Boolean)
}

function randomSuffix(): string {
  let value = ''
  for (let index = 0; index < 10; index += 1) value += String.fromCharCode(97 + Math.floor(Math.random() * 26))
  return value
}

export function toInternal(path: string): string {
  const match = /^\/desk(\/[^?#]*)?(.*)$/s.exec(path)
  if (!match) return path
  const parts = segments(match[1] ?? '')
  const tail = match[2] ?? ''
  const first = parts[0] ? decode(parts[0]) : ''
  if (parts.length >= 2 && shellSlugs.has(first) && !doctypeBySlug.has(first) && !RESERVED.has(first)) parts.shift()
  if (!parts.length) return `/app${tail}`
  const head = decode(parts[0]!)
  if (!RESERVED.has(head)) {
    parts[0] = encodeURIComponent(doctypeBySlug.get(head) ?? head)
    if (parts.length === 2 && decode(parts[1]!).startsWith('new-')) parts[1] = 'new'
  }
  return `/app/${parts.join('/')}${tail}`
}

function toExternal(path: string, keptNew?: string): string {
  const match = /^\/app(\/[^?#]*)?(.*)$/s.exec(path)
  if (!match) return path
  const parts = segments(match[1] ?? '')
  const tail = match[2] ?? ''
  if (!parts.length) return `/desk${tail}`
  const head = decode(parts[0]!)
  if (RESERVED.has(head)) return `/desk/${parts.join('/')}${tail}`
  const slug = slugSegment(head)
  const name = doctypeBySlug.get(slug)
  const shell = name ? shellOfDoctype[name] : undefined
  let rest = parts.slice(1)
  if (rest.length === 1 && decode(rest[0]!) === 'new') {
    rest = [keptNew && keptNew.startsWith(`new-${slug}-`) ? keptNew : `new-${slug}-${randomSuffix()}`]
  }
  const prefix = shell ? [encodeURIComponent(slugSegment(shell))] : []
  return `/desk/${[...prefix, encodeURIComponent(slug), ...rest].join('/')}${tail}`
}

export function canonicalPath(to: string): string {
  if (!/^\/(app|desk)(\/|\?|#|$)/.test(to)) return to
  const kept = /\/(new-[^/?#]+)(?=[/?#]|$)/.exec(to)?.[1]
  return toExternal(toInternal(to), kept)
}
