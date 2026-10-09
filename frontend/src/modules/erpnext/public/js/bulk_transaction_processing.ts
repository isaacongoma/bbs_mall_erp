import { $, __, erpnext, frappe } from '@/shared/frappe'
frappe.provide('erpnext.bulk_transaction_processing')
$.extend(erpnext.bulk_transaction_processing, {
  create: function (listview?: any, from_doctype?: any, to_doctype?: any, args?: any) {
    let checked_items = listview.get_checked_items()
    const doc_name: any = []
    checked_items.forEach((Item?: any) => {
      if (Item.docstatus == 0) {
        doc_name.push(Item.name)
      }
    })
    let count_of_rows = checked_items.length
    frappe.confirm(__('Create {0} {1} ?', [count_of_rows, __(to_doctype)]), () => {
      if (doc_name.length == 0) {
        frappe
          .call({
            method: 'erpnext.utilities.bulk_transaction.transaction_processing',
            args: {
              data: checked_items,
              from_doctype: from_doctype,
              to_doctype: to_doctype,
              args: args,
            },
          })
          .then(() => {})
        if (count_of_rows > 10) {
          frappe.show_alert(__('Starting a background job to create {0} {1}', [count_of_rows, __(to_doctype)]))
        }
      } else {
        frappe.msgprint(__('Selected document must be in submitted state'))
      }
    })
  },
})
