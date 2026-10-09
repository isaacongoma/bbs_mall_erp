import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Address Template', {
  refresh: function (frm?: any) {
    if (frm.is_new() && !frm.doc.template) {
      frappe.call({
        method: 'frappe.contacts.doctype.address_template.address_template.get_default_address_template',
        callback: function (r?: any) {
          frm.set_value('template', r.message)
        },
      })
    }
  },
})
