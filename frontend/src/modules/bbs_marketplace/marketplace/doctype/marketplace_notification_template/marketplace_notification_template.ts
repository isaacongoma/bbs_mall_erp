import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Marketplace Notification Template', {
  refresh(frm: any) {
    if (frm.is_new()) return
    frm.add_custom_button(__('Send Test'), () => {
      frappe.prompt(
        [
          { label: __('Email'), fieldname: 'email', fieldtype: 'Data', options: 'Email' },
          { label: __('Phone'), fieldname: 'phone', fieldtype: 'Data', description: __('For example 0712345678') },
        ],
        (values: { email?: string; phone?: string }) =>
          frappe.call({
            method: 'bbs_marketplace.marketplace.notifications.send_test',
            args: { event: frm.doc.name, email: values.email, phone: values.phone },
            freeze: true,
            callback: (r: any) => frappe.msgprint(r.message),
          }),
        __('Send a test using the latest matching record'),
        __('Send'),
      )
    })
  },
})
