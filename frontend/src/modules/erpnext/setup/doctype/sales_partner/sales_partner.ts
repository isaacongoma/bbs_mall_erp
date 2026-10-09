import { frappe, hide_field, locals, unhide_field } from '@/shared/frappe'
frappe.ui.form.on('Sales Partner', {
  refresh: function (frm?: any) {
    if (frm.doc.__islocal) {
      hide_field(['address_html', 'contact_html', 'address_contacts'])
      frappe.contacts.clear_address_and_contact(frm)
    } else {
      unhide_field(['address_html', 'contact_html', 'address_contacts'])
      frappe.contacts.render_address_and_contact(frm)
    }
  },
  setup: function (frm?: any) {
    frm.fields_dict['targets'].grid.get_field('distribution_id').get_query = function (
      _doc?: any,
      cdt?: any,
      cdn?: any,
    ) {
      const row = locals[cdt][cdn]
      return {
        filters: {
          fiscal_year: row.fiscal_year,
        },
      }
    }
  },
  referral_code: function (frm?: any) {
    if (frm.doc.referral_code) {
      frm.doc.referral_code = frm.doc.referral_code.toUpperCase()
      frm.refresh_field('referral_code')
    }
  },
})
