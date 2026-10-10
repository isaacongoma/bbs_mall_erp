import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Utility Meter', {
  setup(frm: any) {
    frm.set_query('unit', () => ({ filters: { property: frm.doc.property } }))
    frm.set_query('tariff', () => ({ filters: { utility_type: frm.doc.utility_type, disabled: 0 } }))
  },
  refresh(frm: any) {
    if (frm.is_new()) return
    frm.add_custom_button(__('Record Reading'), () => frappe.new_doc('Meter Reading', { meter: frm.doc.name }))
    frm.add_custom_button(
      __('Readings'),
      () => frappe.set_route('List', 'Meter Reading', { meter: frm.doc.name }),
      __('View'),
    )
  },
  utility_type(frm: any) {
    frm.set_value('tariff', null)
  },
})
