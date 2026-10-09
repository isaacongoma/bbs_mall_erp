import { frappe } from '@/shared/frappe'
frappe.ui.form.on('UAE VAT Settings', {
  onload: function (frm?: any) {
    frm.set_query('account', 'uae_vat_accounts', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
  },
})
