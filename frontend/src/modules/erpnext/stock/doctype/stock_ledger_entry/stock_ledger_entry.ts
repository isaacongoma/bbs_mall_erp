import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Stock Ledger Entry', {
  refresh: function (frm?: any) {
    frm.page.btn_secondary.hide()
  },
})
