import { __, frappe } from '@/shared/frappe'
import { docAction, indicate, viewButton } from '../../actions'

frappe.ui.form.on('Seller Order', {
  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    const status = frm.doc.status
    if (status === 'New') docAction(frm, 'Accept', 'accept', { group: 'Fulfilment', confirm: __('Accept this order?') })
    if (status === 'Accepted') docAction(frm, 'Mark Packed', 'mark_packed', { group: 'Fulfilment' })
    if (status === 'Packed') {
      docAction(frm, 'Mark Shipped', 'mark_shipped', {
        group: 'Fulfilment',
        prompt: [{ label: __('Tracking No'), fieldname: 'tracking_no', fieldtype: 'Data' }],
      })
    }
    if (status === 'Shipped') docAction(frm, 'Mark Delivered', 'mark_delivered', { group: 'Fulfilment', confirm: __('Confirm delivery?') })
    if (status === 'Delivered') {
      docAction(frm, 'Complete and Settle', 'complete', { group: 'Fulfilment', confirm: __('Settle this order to the seller wallet?') })
    }
    if (['New', 'Accepted', 'Packed', 'Shipped'].includes(status)) {
      docAction(frm, 'Cancel', 'cancel_order', {
        group: 'Fulfilment',
        prompt: [{ label: __('Reason'), fieldname: 'reason', fieldtype: 'Small Text', reqd: 1 }],
      })
    }
    viewButton(frm, 'Marketplace Order', 'Marketplace Order', frm.doc.marketplace_order)
    viewButton(frm, 'Seller', 'Marketplace Seller', frm.doc.seller)
    viewButton(frm, 'Shipment', 'Marketplace Shipment', frm.doc.shipment)
    viewButton(frm, 'Settlement Journal', 'Journal Entry', frm.doc.journal_entry)
    viewButton(frm, 'Reversal Journal', 'Journal Entry', frm.doc.reversal_journal)
  },
})
