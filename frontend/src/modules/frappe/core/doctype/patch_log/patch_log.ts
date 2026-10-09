import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Patch Log', {
  refresh: function (frm?: any) {
    frm.disable_save()
  },
})
