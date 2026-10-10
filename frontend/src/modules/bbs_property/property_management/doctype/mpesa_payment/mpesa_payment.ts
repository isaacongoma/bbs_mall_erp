import { __, frappe } from '@/shared/frappe'

const COLORS: Record<string, string> = {
  Pending: 'orange',
  Received: 'blue',
  Allocated: 'green',
  Unmatched: 'red',
  Failed: 'red',
  Cancelled: 'gray',
}

frappe.ui.form.on('Mpesa Payment', {
  refresh(frm: any) {
    if (frm.is_new()) return
    frm.page.set_indicator(__(frm.doc.status), COLORS[frm.doc.status] ?? 'gray')
    if (['Received', 'Unmatched'].includes(frm.doc.status) && !frm.doc.payment_entry) {
      frm.add_custom_button(__('Allocate to Tenant'), () => {
        if (!frm.doc.customer) {
          frappe.msgprint(__('Select the tenant this payment belongs to, save, then allocate.'))
          return
        }
        frm.call({
          doc: frm.doc,
          method: 'allocate',
          freeze: true,
          callback: () => frm.reload_doc(),
        })
      })
    }
    if (frm.doc.payment_entry) {
      frm.add_custom_button(
        __('Payment Entry'),
        () => frappe.set_route('Form', 'Payment Entry', frm.doc.payment_entry),
        __('View'),
      )
    }
  },
})
