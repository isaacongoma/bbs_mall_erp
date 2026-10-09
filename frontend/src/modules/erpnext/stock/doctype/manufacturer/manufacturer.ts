import { frappe, hide_field, unhide_field } from '@/shared/frappe'
frappe.ui.form.on('Manufacturer', {
  refresh: function (frm?: any) {
    if (frm.doc.__islocal) {
      hide_field(['address_html', 'contact_html'])
      frappe.contacts.clear_address_and_contact(frm)
    } else {
      unhide_field(['address_html', 'contact_html'])
      frappe.contacts.render_address_and_contact(frm)
    }
  },
})
