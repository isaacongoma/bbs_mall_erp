import { installFormStore } from '../formStore'
import { frappe } from '../runtime'

installFormStore()

const setup = frappe.ui.form.Form.prototype.setup
frappe.ui.form.Form.prototype.setup = function (this: { doctype: string; events: Record<string, unknown> }) {
  const registered = (frappe.ui.form.handlers[this.doctype] ?? {}) as Record<string, unknown[]>
  for (const [fieldname, list] of Object.entries(registered)) {
    if (list.length) this.events[fieldname] = list[list.length - 1]
  }
  return setup.apply(this)
}
