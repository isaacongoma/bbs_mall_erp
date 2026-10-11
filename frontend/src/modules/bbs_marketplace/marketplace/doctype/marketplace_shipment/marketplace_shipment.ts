import { __, frappe } from '@/shared/frappe'
import { docAction, indicate, viewButton } from '../../actions'

const STEPS = ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed Delivery', 'Returning', 'Returned to Seller']

frappe.ui.form.on('Marketplace Shipment', {
  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    STEPS.filter((step) => step !== frm.doc.status).forEach((step) => {
      docAction(frm, step, 'set_status', {
        group: 'Update Status',
        args: { status: step, source: 'Admin' },
        prompt: [
          { label: __('Note'), fieldname: 'note', fieldtype: 'Small Text' },
          { label: __('Location'), fieldname: 'location', fieldtype: 'Data' },
        ],
      })
    })
    viewButton(frm, 'Seller Order', 'Seller Order', frm.doc.seller_order)
    viewButton(frm, 'Courier', 'Courier', frm.doc.courier)
  },
})
