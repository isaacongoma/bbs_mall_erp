import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Account Closing Balance', {
  refresh(frm?: any) {
    frm.page.btn_secondary.hide()
  },
})
