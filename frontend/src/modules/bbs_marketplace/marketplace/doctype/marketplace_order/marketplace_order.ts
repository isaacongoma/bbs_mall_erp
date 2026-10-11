import { __, frappe } from '@/shared/frappe'
import { docAction, indicate, listButton, viewButton } from '../../actions'

frappe.ui.form.on('Marketplace Order', {
  setup(frm: any) {
    frm.set_query('customer', () => ({ filters: { disabled: 0 } }))
  },

  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    if (['Pending Payment', 'Paid', 'Processing'].includes(frm.doc.status)) {
      docAction(frm, 'Cancel Order', 'cancel_marketplace_order', {
        prompt: [{ label: __('Reason'), fieldname: 'reason', fieldtype: 'Small Text', reqd: 1 }],
      })
    }
    if (frm.doc.status === 'Pending Payment') {
      frm.add_custom_button(__('Record Payment'), () => {
        frappe.new_doc('Marketplace Payment', {
          marketplace_order: frm.doc.name,
          method: frm.doc.payment_method,
          amount: frm.doc.outstanding_amount,
          phone: frm.doc.recipient_phone,
        })
      })
    }
    listButton(frm, 'Seller Orders', 'Seller Order', { marketplace_order: frm.doc.name })
    listButton(frm, 'Payments', 'Marketplace Payment', { marketplace_order: frm.doc.name })
    listButton(frm, 'Shipments', 'Marketplace Shipment', { marketplace_order: frm.doc.name })
    listButton(frm, 'Returns', 'Return Request', { marketplace_order: frm.doc.name })
    viewButton(frm, 'Customer', 'Customer', frm.doc.customer)
  },
})
