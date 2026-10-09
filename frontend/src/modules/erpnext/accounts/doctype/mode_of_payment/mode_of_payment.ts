import { frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Mode of Payment', {
  setup: function (frm?: any) {
    frm.set_query('default_account', 'accounts', function (_doc?: any, cdt?: any, cdn?: any) {
      const d = locals[cdt][cdn]
      return {
        filters: [
          ['Account', 'account_type', 'in', ['Bank', 'Cash', 'Receivable']],
          ['Account', 'is_group', '=', 0],
          ['Account', 'company', '=', d.company],
        ],
      }
    })
  },
})
