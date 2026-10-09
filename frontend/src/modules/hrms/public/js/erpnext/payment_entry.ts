import { $, frappe, in_list, locals } from '@/shared/frappe'

frappe.ui.form.on('Payment Entry', {
  refresh: function (frm: any) {
    frm.set_query('reference_doctype', 'references', function () {
      let doctypes: any = []
      if (frm.doc.party_type == 'Customer') {
        doctypes = ['Sales Order', 'Sales Invoice', 'Journal Entry', 'Dunning']
      } else if (frm.doc.party_type == 'Supplier') {
        doctypes = ['Purchase Order', 'Purchase Invoice', 'Journal Entry']
      } else if (frm.doc.party_type == 'Employee') {
        doctypes = ['Expense Claim', 'Employee Advance', 'Leave Encashment', 'Journal Entry']
      } else {
        doctypes = ['Journal Entry']
      }
      return {
        filters: { name: ['in', doctypes] },
      }
    })
    frm.set_query('reference_name', 'references', function (doc: any, cdt: any, cdn: any) {
      const child = locals[cdt][cdn]
      const filters: any = { docstatus: 1, company: doc.company }
      const party_type_doctypes: any = [
        'Sales Invoice',
        'Sales Order',
        'Purchase Invoice',
        'Purchase Order',
        'Expense Claim',
        'Leave Encashment',
        'Dunning',
      ]
      if (in_list(party_type_doctypes, child.reference_doctype)) {
        filters[doc.party_type.toLowerCase()] = doc.party
      }
      if (child.reference_doctype == 'Expense Claim') {
        filters['is_paid'] = 0
      }
      if (child.reference_doctype == 'Employee Advance') {
        filters['status'] = ['in', ['Unpaid', 'Partially Paid']]
      }
      if (child.reference_doctype == 'Leave Encashment') {
        filters['status'] = 'Unpaid'
      }
      return {
        filters: filters,
      }
    })
  },
  get_order_doctypes: function () {
    return ['Sales Order', 'Purchase Order', 'Expense Claim']
  },
  get_invoice_doctypes: function () {
    return ['Sales Invoice', 'Purchase Invoice', 'Expense Claim']
  },
})
frappe.ui.form.on('Payment Entry Reference', {
  reference_name: function (frm: any, cdt: any, cdn: any) {
    let row = locals[cdt][cdn]
    if (row.reference_name && row.reference_doctype) {
      return frappe.call({
        method: 'hrms.overrides.employee_payment_entry.get_payment_reference_details',
        args: {
          reference_doctype: row.reference_doctype,
          reference_name: row.reference_name,
          party_account_currency:
            frm.doc.payment_type == 'Receive' ? frm.doc.paid_from_account_currency : frm.doc.paid_to_account_currency,
          party_type: frm.doc.party_type,
          party: frm.doc.party,
        },
        callback: function (r: any) {
          if (r.message) {
            $.each(r.message, function (field: any, value: any) {
              frappe.model.set_value(cdt, cdn, field, value)
            })
            let allocated_amount =
              frm.doc.unallocated_amount > row.outstanding_amount ? row.outstanding_amount : frm.doc.unallocated_amount
            frappe.model.set_value(cdt, cdn, 'allocated_amount', allocated_amount)
            frm.refresh_fields()
          }
        },
      })
    }
  },
})
