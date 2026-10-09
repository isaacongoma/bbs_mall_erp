import { cint, flt, frappe, refresh_many } from '@/shared/frappe'

frappe.ui.form.on('Employee Benefit Application', {
  employee: function (frm: any) {
    if (frm.doc.employee) {
      frappe.run_serially([() => frm.trigger('set_earning_component')])
    }
  },
  date: function (frm: any) {
    frm.trigger('set_earning_component')
  },
  set_earning_component: function (frm: any) {
    if (!frm.doc.date || !frm.doc.employee) {
      frm.doc.employee_benefits = []
    } else {
      frm.call('set_benefit_components_and_currency')
    }
    frm.refresh_fields()
  },
})
frappe.ui.form.on('Employee Benefit Application Detail', {
  amount: function (frm: any) {
    calculate_all(frm.doc)
  },
  employee_benefits_remove: function (frm: any) {
    calculate_all(frm.doc)
  },
})
let calculate_all = function (doc: any) {
  let tbl = doc.employee_benefits || []
  let total_amount = 0
  if (doc.max_benefits === 0) {
    doc.employee_benefits = []
  } else {
    for (let i = 0; i < tbl.length; i++) {
      if (cint(tbl[i].amount) > 0) {
        total_amount += flt(tbl[i].amount)
      }
    }
  }
  doc.total_amount = total_amount
  doc.remaining_benefit = doc.max_benefits - total_amount
  refresh_many(['total_amount', 'remaining_benefit'])
}
