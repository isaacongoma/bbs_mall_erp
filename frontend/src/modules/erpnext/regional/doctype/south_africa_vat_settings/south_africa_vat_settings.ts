import { frappe } from '@/shared/frappe'
frappe.ui.form.on('South Africa VAT Settings', {
  refresh: function (frm?: any) {
    frm.set_query('company', function () {
      return {
        filters: {
          country: 'South Africa',
        },
      }
    })
    frm.set_query('account', 'vat_accounts', function () {
      return {
        filters: {
          company: frm.doc.company,
          account_type: 'Tax',
          is_group: 0,
        },
      }
    })
  },
})
