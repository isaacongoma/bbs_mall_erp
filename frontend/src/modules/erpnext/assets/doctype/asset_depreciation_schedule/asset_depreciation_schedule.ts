import { $, erpnext, flt, frappe, locals } from '@/shared/frappe'
frappe.provide('erpnext.asset')
frappe.ui.form.on('Asset Depreciation Schedule', {
  onload: function (frm?: any) {
    frm.events.make_schedules_editable(frm)
  },
  make_schedules_editable: function (frm?: any) {
    const is_manual_hence_editable = frm.doc.depreciation_method === 'Manual' ? true : false
    const is_shift_hence_editable = frm.doc.shift_based ? true : false
    frm.toggle_enable('depreciation_schedule', is_manual_hence_editable || is_shift_hence_editable)
    frm.fields_dict['depreciation_schedule'].grid.toggle_enable('schedule_date', is_manual_hence_editable)
    frm.fields_dict['depreciation_schedule'].grid.toggle_enable('depreciation_amount', is_manual_hence_editable)
    frm.fields_dict['depreciation_schedule'].grid.toggle_enable('shift', is_shift_hence_editable)
  },
})
frappe.ui.form.on('Depreciation Schedule', {
  make_depreciation_entry: function (frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (!row.journal_entry) {
      frappe.call({
        method: 'erpnext.assets.doctype.asset.depreciation.make_depreciation_entry',
        args: {
          depr_schedule_name: frm.doc.name,
          date: row.schedule_date,
        },
        debounce: 1000,
        callback: function (r?: any) {
          frappe.model.sync(r.message)
          frm.refresh()
        },
      })
    }
  },
  depreciation_amount: function (frm?: any) {
    erpnext.asset.set_accumulated_depreciation(frm)
  },
})
erpnext.asset.set_accumulated_depreciation = function (frm?: any) {
  if (frm.doc.depreciation_method != 'Manual') return
  let accumulated_depreciation = flt(frm.doc.opening_accumulated_depreciation)
  $.each(frm.doc.depreciation_schedule || [], function (_i?: any, row?: any) {
    accumulated_depreciation += flt(row.depreciation_amount)
    frappe.model.set_value(row.doctype, row.name, 'accumulated_depreciation_amount', accumulated_depreciation)
  })
}
