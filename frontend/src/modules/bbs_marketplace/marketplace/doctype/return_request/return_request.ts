import { __, frappe } from '@/shared/frappe'
import { docAction, indicate, viewButton } from '../../actions'

frappe.ui.form.on('Return Request', {
  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    const status = frm.doc.status
    if (status === 'Requested') {
      docAction(frm, 'Approve', 'decide', {
        group: 'Decision',
        args: { approve: 1 },
        prompt: [{ label: __('Note'), fieldname: 'note', fieldtype: 'Small Text' }],
      })
      docAction(frm, 'Reject', 'decide', {
        group: 'Decision',
        args: { approve: 0 },
        prompt: [{ label: __('Reason'), fieldname: 'note', fieldtype: 'Small Text', reqd: 1 }],
      })
    }
    if (status === 'Approved' || status === 'Pickup Scheduled') {
      docAction(frm, 'Mark Received', 'receive', { group: 'Decision', confirm: __('Confirm the goods were received?') })
    }
    if (status === 'Received') {
      docAction(frm, 'Refund Buyer', 'refund', { group: 'Decision', confirm: __('Refund the buyer and reverse the seller settlement?') })
    }
    viewButton(frm, 'Marketplace Order', 'Marketplace Order', frm.doc.marketplace_order)
    viewButton(frm, 'Seller Order', 'Seller Order', frm.doc.seller_order)
    viewButton(frm, 'Reversal Journal', 'Journal Entry', frm.doc.reverse_journal)
  },
})
