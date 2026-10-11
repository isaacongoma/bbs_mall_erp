import { __, format_currency, frappe } from '@/shared/frappe'
import { docAction, indicate, viewButton } from '../../actions'

frappe.ui.form.on('Seller Ad', {
  setup(frm: any) {
    frm.set_query('listing', 'listings', () => ({ filters: { seller: frm.doc.seller, status: 'Published' } }))
  },

  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    if (frm.doc.status === 'Pending Payment') {
      docAction(frm, 'Charge Wallet and Start', 'activate', {
        confirm: __('Take {0} from the seller wallet and start this ad?', [format_currency(frm.doc.total)]),
      })
    }
    if (['Active', 'Pending Payment'].includes(frm.doc.status)) {
      docAction(frm, 'Cancel Ad', 'cancel_ad', { confirm: __('Stop this ad?') })
    }
    viewButton(frm, 'Seller', 'Marketplace Seller', frm.doc.seller)
    viewButton(frm, 'Journal Entry', 'Journal Entry', frm.doc.journal_entry)
  },
})
