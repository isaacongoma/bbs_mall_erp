type Loader = () => Promise<unknown>
type Kind = 'doctype' | 'report' | 'page'

const registry: Record<Kind, Record<string, Loader[]>> = { doctype: {}, report: {}, page: {} }
const sharedLoaders: Record<string, Loader> = {}
const doctypeExtensions: Record<string, Loader[]> = {}
const loaded = new Map<string, Promise<void>>()

export function scrub(value: string): string {
  return value.toLowerCase().replaceAll(' ', '_').replaceAll('-', '_')
}

const PATH_PATTERN = /\/(doctype|report|page)\/([^/]+)\/[^/]+\.ts$/

export function registerClientScripts(modules: Record<string, Loader>): void {
  for (const [path, loader] of Object.entries(modules)) {
    const match = PATH_PATTERN.exec(path)
    if (!match) continue
    const kind = match[1] as Kind
    const key = match[2] as string
    registry[kind][key] ??= []
    registry[kind][key]!.push(loader)
  }
}

export function registerDoctypeExtensions(doctype: string, loader: Loader): void {
  const key = scrub(doctype)
  doctypeExtensions[key] ??= []
  doctypeExtensions[key]!.push(loader)
}

export function registerSharedScripts(name: string, loader: Loader): void {
  sharedLoaders[name] = loader
}

async function loadOnce(key: string, task: () => Promise<void>): Promise<void> {
  let promise = loaded.get(key)
  if (!promise) {
    promise = task()
    loaded.set(key, promise)
  }
  return promise
}

export async function ensureSharedScripts(): Promise<void> {
  for (const [name, loader] of Object.entries(sharedLoaders)) {
    await loadOnce(`shared:${name}`, async () => {
      await loader()
    })
  }
}

async function ensureKind(kind: Kind, name: string): Promise<void> {
  await ensureSharedScripts()
  await loadOnce(`${kind}:${name}`, async () => {
    for (const loader of registry[kind][scrub(name)] ?? []) await loader()
    if (kind === 'doctype') for (const loader of doctypeExtensions[scrub(name)] ?? []) await loader()
  })
}

export function ensureDoctypeScripts(doctype: string): Promise<void> {
  return ensureKind('doctype', doctype)
}

export function ensureReportScripts(report: string): Promise<void> {
  return ensureKind('report', report)
}

export function hasPageScript(page: string): boolean {
  return (registry.page[scrub(page)]?.length ?? 0) > 0
}

export function ensurePageScripts(page: string): Promise<void> {
  return ensureKind('page', page)
}

export function resetScriptLoader(): void {
  for (const kind of Object.keys(registry) as Kind[]) registry[kind] = {}
  for (const key of Object.keys(sharedLoaders)) delete sharedLoaders[key]
  for (const key of Object.keys(doctypeExtensions)) delete doctypeExtensions[key]
  loaded.clear()
}
