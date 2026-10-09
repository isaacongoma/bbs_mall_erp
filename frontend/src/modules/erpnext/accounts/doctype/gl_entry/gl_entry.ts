import { frappe } from '@/shared/frappe'
frappe.ui.form.on('GL Entry', {
  refresh: function (frm?: any) {
    frm.page.btn_secondary.hide()
  },
})
