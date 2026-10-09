import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Employee Benefit Ledger', {
  refresh: (frm: any) => {
    frm.set_read_only()
    frm.page.btn_primary.hide()
  },
})
