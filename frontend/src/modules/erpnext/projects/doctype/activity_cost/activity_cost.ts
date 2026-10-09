import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Activity Cost', {
  setup: function (frm?: any) {
    frm.add_fetch('employee', 'employee_name', 'employee_name')
  },
})
