import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Retention Bonus', {
  setup: function (frm: any) {
    frm.set_query('employee', function () {
      if (!frm.doc.company) {
        frappe.msgprint(__('Please Select Company First'))
      }
      return {
        filters: {
          status: 'Active',
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('salary_component', function () {
      return {
        filters: {
          type: 'Earning',
        },
      }
    })
  },
  employee: function (frm: any) {
    if (frm.doc.employee) {
      frappe.call({
        method: 'hrms.payroll.doctype.salary_structure_assignment.salary_structure_assignment.get_employee_currency',
        args: {
          employee: frm.doc.employee,
        },
        callback: function (r: any) {
          if (r.message) {
            frm.set_value('currency', r.message)
            frm.refresh_fields()
          }
        },
      })
    }
  },
})
