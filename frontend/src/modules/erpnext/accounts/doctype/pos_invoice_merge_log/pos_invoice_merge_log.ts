import { frappe } from '@/shared/frappe'
frappe.ui.form.on('POS Invoice Merge Log', {
  setup: function (frm?: any) {
    frm.set_query('pos_invoice', 'pos_invoices', (doc?: any) => {
      return {
        filters: {
          docstatus: 1,
          customer: doc.customer,
          consolidated_invoice: '',
        },
      }
    })
  },
  merge_invoices_based_on: function (frm?: any) {
    frm.set_value('customer', '')
    frm.set_value('customer_group', '')
  },
})
