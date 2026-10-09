import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Personal Data Download Request', {
  onload: function (frm?: any) {
    if (frm.is_new()) {
      frm.doc.user = frappe.session.user
    }
  },
})
