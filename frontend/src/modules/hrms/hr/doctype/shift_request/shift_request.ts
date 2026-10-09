import { erpnext, frappe } from '@/shared/frappe'

frappe.ui.form.on('Shift Request', {
  setup: function (frm: any) {
    frm.set_query('approver', function () {
      return {
        query: 'hrms.hr.doctype.department_approver.department_approver.get_approvers',
        filters: {
          employee: frm.doc.employee,
          doctype: frm.doc.doctype,
        },
      }
    })
    frm.set_query('employee', erpnext.queries.employee)
  },
})
