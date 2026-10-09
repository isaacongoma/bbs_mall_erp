import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Activity Log', {
  refresh: function (frm?: any) {
    frm.disable_form()
  },
})
