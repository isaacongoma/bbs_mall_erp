import { __, flt, format_currency, frappe } from '@/shared/frappe'
import { indicate, listButton, viewButton } from '../../actions'

frappe.ui.form.on('Marketplace Seller', {
  setup(frm: any) {
    frm.set_query('customer', () => ({ filters: { disabled: 0 } }))
  },

  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    frappe.call({
      method: 'bbs_marketplace.api.admin.wallet_summary',
      args: { seller: frm.doc.name },
      callback: (r: any) => {
        const wallet = r.message
        if (!wallet) return
        frm.dashboard.add_indicator(__('Balance: {0}', [format_currency(flt(wallet.balance))]), 'blue')
        frm.dashboard.add_indicator(__('Pending: {0}', [format_currency(flt(wallet.pending))]), 'orange')
        frm.dashboard.add_indicator(__('Available: {0}', [format_currency(flt(wallet.available))]), 'green')
      },
    })
    const setStatus = (label: string, status: string) =>
      frm.add_custom_button(
        __(label),
        () => frappe.confirm(__('{0} this seller?', [__(label)]), () => frm.set_value('status', status).then(() => frm.save())),
        __('Account'),
      )
    if (frm.doc.status === 'Pending Approval') {
      setStatus('Approve', 'Active')
      setStatus('Reject', 'Rejected')
    }
    if (frm.doc.status === 'Active') setStatus('Suspend', 'Suspended')
    if (frm.doc.status === 'Suspended') setStatus('Reactivate', 'Active')
    frm.add_custom_button(
      __('Wallet Statement'),
      () => frappe.set_route('query-report', 'Seller Wallet Statement', { seller: frm.doc.name }),
      __('View'),
    )
    listButton(frm, 'Listings', 'Marketplace Listing', { seller: frm.doc.name })
    listButton(frm, 'Orders', 'Seller Order', { seller: frm.doc.name })
    listButton(frm, 'Withdrawals', 'Seller Withdrawal', { seller: frm.doc.name })
    viewButton(frm, 'Tenant Customer', 'Customer', frm.doc.customer)
    viewButton(frm, 'Wallet Supplier', 'Supplier', frm.doc.supplier)
    viewButton(frm, 'Warehouse', 'Warehouse', frm.doc.warehouse)
  },
})
