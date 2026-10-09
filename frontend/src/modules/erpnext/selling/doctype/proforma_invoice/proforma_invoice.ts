import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Proforma Invoice', {
  refresh(frm?: any) {
    frm.page.btn_primary.toggle(frm.doc.docstatus !== 2)
  },
})
