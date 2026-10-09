import { $, __, frappe, hide_field, unhide_field } from '@/shared/frappe'
frappe.ui.form.on('Shareholder', {
  refresh: function (frm?: any) {
    frm.toggle_display(['contact_html'], !frm.doc.__islocal)
    if (frm.doc.__islocal) {
      hide_field(['contact_html'])
      frappe.contacts.clear_address_and_contact(frm)
    } else {
      if (frm.doc.is_company) {
        hide_field(['company'])
      } else {
        unhide_field(['contact_html'])
        frappe.contacts.render_address_and_contact(frm)
      }
    }
    if (frm.doc.folio_no != undefined) {
      frm.add_custom_button(__('Share Balance'), function () {
        frappe.route_options = {
          shareholder: frm.doc.name,
        }
        frappe.set_route('query-report', 'Share Balance')
      })
      frm.add_custom_button(__('Share Ledger'), function () {
        frappe.route_options = {
          shareholder: frm.doc.name,
        }
        frappe.set_route('query-report', 'Share Ledger')
      })
      const fields: any = ['title', 'folio_no', 'company']
      fields.forEach((fieldname?: any) => {
        frm.fields_dict[fieldname].df.read_only = 1
        frm.refresh_fields(fieldname)
      })
      $(`.btn:contains("New Contact"):visible`).hide()
      $(`.btn:contains("Edit"):visible`).hide()
    }
  },
  validate: (frm?: any) => {
    const contact_list: any = {
      contacts: [],
    }
    $('div[data-fieldname=contact_html] > .address-box').each((_index?: any, ele?: any) => {
      contact_list.contacts.push(ele.innerText.replace(' Edit', ''))
    })
    frm.doc.contact_list = JSON.stringify(contact_list)
  },
})
