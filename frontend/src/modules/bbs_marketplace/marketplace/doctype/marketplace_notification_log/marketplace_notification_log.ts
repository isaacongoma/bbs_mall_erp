import { __, frappe } from '@/shared/frappe'
import { indicate, viewButton } from '../../actions'

frappe.ui.form.on('Marketplace Notification Log', {
  refresh(frm: any) {
    indicate(frm)
    if (frm.doc.status === 'Failed' || frm.doc.status === 'Skipped') {
      frm.add_custom_button(__('Send Again'), () =>
        frappe.call({
          method: 'bbs_marketplace.marketplace.notifications.resend',
          args: { log: frm.doc.name },
          freeze: true,
          callback: () => frm.reload_doc(),
        }),
      )
    }
    if (frm.doc.reference_doctype && frm.doc.reference_name) {
      viewButton(frm, 'Reference', frm.doc.reference_doctype, frm.doc.reference_name)
    }
  },
})
