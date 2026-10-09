import { frappe } from '@/shared/frappe'
frappe.ui.form.on('RQ Worker', {
  refresh: function (frm?: any) {
    frm.disable_form()
  },
})
