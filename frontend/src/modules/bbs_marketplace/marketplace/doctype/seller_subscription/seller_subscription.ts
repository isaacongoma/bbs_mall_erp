import { __, format_currency, frappe } from '@/shared/frappe'
import { docAction, indicate, viewButton } from '../../actions'

frappe.ui.form.on('Seller Subscription', {
  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    if (frm.doc.status === 'Pending Payment') {
      docAction(frm, 'Charge Wallet and Activate', 'activate', {
        confirm: __('Take {0} from the seller wallet and activate this plan?', [format_currency(frm.doc.total)]),
      })
    }
    if (['Active', 'Pending Payment'].includes(frm.doc.status)) {
      docAction(frm, 'Cancel Subscription', 'cancel_subscription', { confirm: __('Cancel this subscription?') })
    }
    viewButton(frm, 'Seller', 'Marketplace Seller', frm.doc.seller)
    viewButton(frm, 'Journal Entry', 'Journal Entry', frm.doc.journal_entry)
  },
})
