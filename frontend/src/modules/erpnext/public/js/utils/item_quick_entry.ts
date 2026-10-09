import { frappe } from '@/shared/frappe'
frappe.provide('frappe.ui.form')
frappe.ui.form.ItemQuickEntryForm = class ItemQuickEntryForm extends frappe.ui.form.QuickEntryForm {
  [key: string]: any
  render_dialog(this: any) {
    super.render_dialog()
    this.set_query('item_group', () => ({ filters: { is_group: 0 } }))
  }
}
