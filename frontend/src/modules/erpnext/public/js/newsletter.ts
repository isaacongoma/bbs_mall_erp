import { erpnext, frappe } from '@/shared/frappe'
frappe.ui.form.on('Newsletter', {
  refresh(frm?: any) {
    erpnext.toggle_naming_series(frm)
  },
})
