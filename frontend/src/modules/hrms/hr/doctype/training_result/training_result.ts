import { $, frappe, refresh_field } from '@/shared/frappe'

frappe.ui.form.on('Training Result', {
  training_event: function (frm: any) {
    if (frm.doc.training_event && !frm.doc.docstatus) {
      frappe.call({
        method: 'hrms.hr.doctype.training_result.training_result.get_employees',
        args: {
          training_event: frm.doc.training_event,
        },
        callback: function (r: any) {
          frm.set_value('employees', '')
          if (r.message) {
            $.each(r.message, function (_i: any, d: any) {
              let row = frappe.model.add_child(frm.doc, 'Training Result Employee', 'employees')
              row.employee = d.employee
              row.employee_name = d.employee_name
            })
          }
          refresh_field('employees')
        },
      })
    }
  },
})
