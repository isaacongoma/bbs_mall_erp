import { frappe, locals } from '@/shared/frappe'

frappe.ui.form.on('Expense Claim Type', {
  refresh: function (frm: any) {
    frm.fields_dict['accounts'].grid.get_field('default_account').get_query = function (_doc: any, cdt: any, cdn: any) {
      let d = locals[cdt][cdn]
      return {
        filters: {
          is_group: 0,
          root_type: frm.doc.deferred_expense_account ? 'Asset' : 'Expense',
          company: d.company,
        },
      }
    }
  },
})
