import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Payment Terms Template', {
  refresh: function (frm?: any) {
    frm.fields_dict.terms.grid.toggle_reqd('payment_term', frm.doc.allocate_payment_based_on_payment_terms)
  },
  allocate_payment_based_on_payment_terms: function (frm?: any) {
    frm.fields_dict.terms.grid.toggle_reqd('payment_term', frm.doc.allocate_payment_based_on_payment_terms)
  },
})
