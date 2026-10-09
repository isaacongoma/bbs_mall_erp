import { __, cur_frm, frappe, locals } from '@/shared/frappe'

frappe.ui.form.on('Gratuity Rule', {})
frappe.ui.form.on('Gratuity Rule Slab', {
  gratuity_rule_slabs_add(frm: any, cdt: any, cdn: any) {
    let row = locals[cdt][cdn]
    let array_idx = row.idx - 1
    if (array_idx > 0) {
      row.from_year = cur_frm.doc.gratuity_rule_slabs[array_idx - 1].to_year
      frm.refresh()
    }
  },
  to_year(_frm: any, cdt: any, cdn: any) {
    let row = locals[cdt][cdn]
    if (row.to_year <= row.from_year && row.to_year === 0) {
      frappe.throw(__('To(Year) year can not be less than From(year)'))
    }
  },
})
