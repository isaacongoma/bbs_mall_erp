import '../frappe/upstream'
import { $, frappe, locals } from './runtime'
import { loadDeskBoot } from './boot'
import { observeElement } from './formStore'
import { ensureDoctypeScripts } from './scriptLoader'

type AnyRecord = Record<string, any>

const forms = new Map<string, AnyRecord>()
const pending = new Map<string, Promise<unknown>>()

export function getForm(doctype: string): AnyRecord | undefined {
  return forms.get(doctype)
}

export function resetForms(): void {
  forms.clear()
  pending.clear()
}

function createForm(doctype: string): AnyRecord {
  const wrapper = $('<div class="frappe-form-host"></div>')[0] as HTMLElement
  const frm = new frappe.ui.form.Form(doctype, wrapper, true)
  observeElement(wrapper)
  forms.set(doctype, frm)
  return frm
}

export function openForm(doctype: string, name?: string): Promise<AnyRecord> {
  const previous = pending.get(doctype) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(() => openFormNow(doctype, name))
  pending.set(doctype, next)
  return next
}

async function openFormNow(doctype: string, name?: string): Promise<AnyRecord> {
  if (!import.meta.env.VITEST) await loadDeskBoot()
  await frappe.model.with_doctype(doctype)
  await ensureDoctypeScripts(doctype)
  let docname = name && name !== 'new' ? name : undefined
  if (!docname) {
    docname = frappe.model.make_new_doc_and_get_name(doctype, true) as string
  } else if (frappe.model.new_names?.[docname]) {
    docname = frappe.model.new_names[docname] as string
  } else {
    const existing = locals[doctype]?.[docname]
    const fresh =
      existing && frappe.model.get_docinfo(doctype, docname) && (existing.__islocal || frappe.model.is_fresh(existing))
    if (!fresh) {
      await frappe.model.with_doc(doctype, docname)
      if (!locals[doctype]?.[docname]) {
        if (docname.startsWith('new')) docname = frappe.model.make_new_doc_and_get_name(doctype, true) as string
        else throw new Error(`${doctype} ${docname} not found`)
      }
    }
  }
  const frm = forms.get(doctype) ?? createForm(doctype)
  await frm.refresh(docname)
  return frm
}
