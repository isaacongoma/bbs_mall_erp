import { frappe } from './runtime'
import { resetLocals } from './locals'

export { resetLocals }

export function resetHandlers(): void {
  const form = frappe.ui.form
  for (const key of Object.keys(form.handlers ?? {})) delete form.handlers[key]
  for (const key of Object.keys(form.controllers ?? {})) delete form.controllers[key]
}

export function resetModel(): void {
  resetLocals()
  for (const key of Object.keys(frappe.model.events ?? {})) delete frappe.model.events[key]
}
