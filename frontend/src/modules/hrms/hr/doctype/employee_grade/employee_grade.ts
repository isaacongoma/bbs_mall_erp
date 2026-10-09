import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Employee Grade', {
  refresh: function () {},
  setup: function (frm: any) {
    frm.set_query('default_salary_structure', function () {
      return {
        filters: {
          docstatus: 1,
          is_active: 'Yes',
        },
      }
    })
    frm.set_query('default_leave_policy', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })
  },
})
