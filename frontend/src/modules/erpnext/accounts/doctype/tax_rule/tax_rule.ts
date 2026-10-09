import { $, frappe } from '@/shared/frappe'
frappe.ui.form.on('Tax Rule', 'customer', function (frm?: any) {
  if (frm.doc.customer) {
    frappe.call({
      method: 'erpnext.accounts.doctype.tax_rule.tax_rule.get_party_details',
      args: {
        party: frm.doc.customer,
        party_type: 'customer',
      },
      callback: function (r?: any) {
        if (!r.exc) {
          $.each(r.message, function (k?: any, v?: any) {
            frm.set_value(k, v)
          })
        }
      },
    })
  }
})
frappe.ui.form.on('Tax Rule', 'supplier', function (frm?: any) {
  if (frm.doc.supplier) {
    frappe.call({
      method: 'erpnext.accounts.doctype.tax_rule.tax_rule.get_party_details',
      args: {
        party: frm.doc.supplier,
        party_type: 'supplier',
      },
      callback: function (r?: any) {
        if (!r.exc) {
          $.each(r.message, function (k?: any, v?: any) {
            frm.set_value(k, v)
          })
        }
      },
    })
  }
})
