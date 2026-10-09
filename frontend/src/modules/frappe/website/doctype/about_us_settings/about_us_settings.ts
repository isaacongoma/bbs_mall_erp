import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('About Us Settings', {
  refresh: function (frm?: any) {
    frm.set_intro(__('Link for About Us Page is "/about".'))
  },
})
