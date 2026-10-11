import { __, frappe } from '@/shared/frappe'
import { docAction, indicate, viewButton } from '../../actions'

frappe.ui.form.on('Marketplace Payment', {
  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    if (['Initiated', 'Pending'].includes(frm.doc.status)) {
      docAction(frm, 'Confirm Received', 'mark_paid', {
        group: 'Actions',
        prompt: [{ label: __('Receipt'), fieldname: 'receipt', fieldtype: 'Data', reqd: 1 }],
      })
      docAction(frm, 'Mark Failed', 'mark_failed', {
        group: 'Actions',
        prompt: [{ label: __('Reason'), fieldname: 'reason', fieldtype: 'Small Text', reqd: 1 }],
      })
    }
    viewButton(frm, 'Order', 'Marketplace Order', frm.doc.marketplace_order)
    viewButton(frm, 'Payment Entry', 'Payment Entry', frm.doc.payment_entry)
  },
})
