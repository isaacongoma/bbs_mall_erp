import { erpnext, frappe } from '@/shared/frappe'
frappe.ui.form.on('Advance Payment Ledger Entry', {
  refresh(frm?: any) {
    frm.page.btn_secondary.hide()
    frm.set_currency_labels(['amount'], frm.doc.currency)
    frm.set_currency_labels(['base_amount'], erpnext.get_currency(frm.doc.company))
  },
})
