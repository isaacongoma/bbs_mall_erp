import { $, frappe } from './runtime'
import { loadDeskBoot } from './boot'
import { observeElement } from './formStore'
import { ensureDoctypeScripts } from './scriptLoader'

type AnyRecord = Record<string, any>

const instances = new Map<string, AnyRecord>()
let moduleReady: Promise<void> | null = null

function ensureTreeModule(): Promise<void> {
  moduleReady ??= (async () => {
    const views = frappe as AnyRecord
    views.views ??= {}
    views.views.Factory ??= class Factory {}
    views.views.ListViewSelect ??= class ListViewSelect {}
    views.views.view_icon_map ??= {}
    views.views.get_view_label_map ??= () => ({})
    views.container ??= {
      page: null,
      add_page(name: string) {
        const element = $(`<div class="content page-container" data-page-route="${name}"></div>`)[0] as HTMLElement
        return element
      },
      change_to() {
        return undefined
      },
    }
    await import('./upstream/views/treeview')
  })()
  return moduleReady
}

export interface TreeHandle {
  treeview: AnyRecord
  wrapper: HTMLElement
}

export function hasTreeView(doctype: string): boolean {
  const meta = frappe.get_meta?.(doctype) as AnyRecord | undefined
  return Boolean((frappe.treeview_settings as AnyRecord | undefined)?.[doctype] || meta?.is_tree)
}

let chain: Promise<unknown> = Promise.resolve()

export function openTree(doctype: string): Promise<TreeHandle> {
  const next = chain.catch(() => undefined).then(() => openTreeNow(doctype))
  chain = next
  return next
}

async function openTreeNow(doctype: string): Promise<TreeHandle> {
  await loadDeskBoot()
  await frappe.model.with_doctype(doctype)
  await ensureDoctypeScripts(doctype)
  await ensureTreeModule()
  const settings = ((frappe.treeview_settings as AnyRecord)[doctype] ?? {}) as AnyRecord
  const options: AnyRecord = { doctype, meta: frappe.get_meta(doctype), ...settings }
  instances.get(doctype)?.parent?.remove?.()
  const treeview = new (frappe.views as AnyRecord).TreeView(options)
  ;(frappe.views as AnyRecord).trees[doctype] = treeview
  instances.set(doctype, treeview)
  const wrapper = treeview.parent as HTMLElement
  observeElement(wrapper)
  return { treeview, wrapper }
}

export function closeTree(doctype: string): void {
  const treeview = instances.get(doctype)
  treeview?.parent?.remove?.()
  instances.delete(doctype)
}
