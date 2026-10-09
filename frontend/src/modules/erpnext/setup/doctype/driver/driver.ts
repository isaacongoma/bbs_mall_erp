import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Driver', {
  setup: function (frm?: any) {
    frm.set_query('transporter', function () {
      return {
        filters: {
          is_transporter: 1,
        },
      }
    })
  },
  refresh: function (frm?: any) {
    frm.set_query('address', function () {
      return {
        filters: {
          is_your_company_address: !frm.doc.transporter ? 1 : 0,
        },
      }
    })
  },
  transporter: function (frm?: any, cdt?: any, cdn?: any) {
    if (!frm.doc.transporter) return
    const transporter = frm.doc.transporter
    frappe.call({
      method: 'frappe.contacts.doctype.address.address.get_default_address',
      args: {
        doctype: 'Supplier',
        name: transporter,
      },
      callback: function (r?: any) {
        if (frm.doc.transporter === transporter) {
          frappe.model.set_value(cdt, cdn, 'address', r.message)
        }
      },
    })
  },
})
