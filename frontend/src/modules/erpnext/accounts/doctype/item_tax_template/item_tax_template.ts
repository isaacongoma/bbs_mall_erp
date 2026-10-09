import { frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Item Tax Template', {
  setup: function (frm?: any) {
    frm.set_query('tax_type', 'taxes', function () {
      return {
        filters: [
          ['Account', 'company', '=', frm.doc.company],
          ['Account', 'is_group', '=', 0],
          [
            'Account',
            'account_type',
            'in',
            ['Tax', 'Chargeable', 'Income Account', 'Expense Account', 'Expenses Included In Valuation'],
          ],
        ],
      }
    })
  },
  company: function (frm?: any) {
    frm.set_query('tax_type', 'taxes', function () {
      return {
        filters: [
          ['Account', 'company', '=', frm.doc.company],
          ['Account', 'is_group', '=', 0],
          [
            'Account',
            'account_type',
            'in',
            ['Tax', 'Chargeable', 'Income Account', 'Expense Account', 'Expenses Included In Valuation'],
          ],
        ],
      }
    })
  },
})
frappe.ui.form.on('Item Tax Template Detail', {
  not_applicable: function (_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.not_applicable) {
      frappe.model.set_value(cdt, cdn, 'tax_rate', 0)
    }
  },
})
