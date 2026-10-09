import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Payment Ledger Entry', {
  refresh(frm?: any) {
    frm.page.btn_secondary.hide()
  },
})
