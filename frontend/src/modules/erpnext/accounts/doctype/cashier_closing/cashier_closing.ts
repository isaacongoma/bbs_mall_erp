import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Cashier Closing', {
  setup: function (frm?: any) {
    if (frm.doc.user == '' || frm.doc.user == null) {
      frm.doc.user = frappe.session.user
    }
  },
})
