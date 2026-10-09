import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Department', {
  refresh: function (frm: any) {
    frm.set_query('payroll_cost_center', function () {
      return {
        filters: {
          company: frm.doc.company,
          is_group: 0,
        },
      }
    })
    ;['leave_approvers', 'expense_approvers', 'shift_request_approver'].forEach((table: any) => {
      frm.set_query('approver', table, function () {
        return {
          filters: {
            user_type: 'System User',
          },
        }
      })
    })
  },
})
