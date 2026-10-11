import { __, frappe } from '@/shared/frappe'
import { docAction, indicate, viewButton } from '../../actions'

frappe.ui.form.on('Seller Withdrawal', {
  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    const status = frm.doc.status
    if (status === 'Pending Approval' || status === 'Requested') {
      docAction(frm, 'Approve and Pay', 'approve', { group: 'Payout', confirm: __('Approve and send this payout?') })
      docAction(frm, 'Reject', 'reject', {
        group: 'Payout',
        prompt: [{ label: __('Reason'), fieldname: 'reason', fieldtype: 'Small Text', reqd: 1 }],
      })
    }
    if (status === 'Approved' || status === 'Processing') {
      docAction(frm, 'Mark Paid', 'mark_paid', {
        group: 'Payout',
        prompt: [{ label: __('Receipt No'), fieldname: 'receipt_no', fieldtype: 'Data', reqd: 1 }],
      })
      docAction(frm, 'Mark Failed', 'mark_failed', {
        group: 'Payout',
        prompt: [{ label: __('Reason'), fieldname: 'reason', fieldtype: 'Small Text', reqd: 1 }],
      })
    }
    viewButton(frm, 'Seller', 'Marketplace Seller', frm.doc.seller)
    viewButton(frm, 'Hold Journal', 'Journal Entry', frm.doc.hold_journal)
    viewButton(frm, 'Payout Journal', 'Journal Entry', frm.doc.payout_journal)
  },
})
