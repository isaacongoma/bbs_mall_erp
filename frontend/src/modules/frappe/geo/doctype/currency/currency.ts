import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Currency', {
  refresh(frm?: any) {
    if (!frm.doc.enabled) {
      frm.set_intro(__('This Currency is disabled. Enable to use in transactions'))
    }
  },
})
