import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Lease Deposit', {
  setup(frm: any) {
    frm.set_query('against_invoice', () => ({
      filters: { customer: frm.doc.customer, docstatus: 1, outstanding_amount: ['>', 0] },
    }))
    frm.set_query('bank_account', () => ({
      filters: { company: frm.doc.company, account_type: ['in', ['Bank', 'Cash']], is_group: 0 },
    }))
  },
  refresh(frm: any) {
    if (frm.doc.journal_entry) {
      frm.add_custom_button(
        __('Journal Entry'),
        () => frappe.set_route('Form', 'Journal Entry', frm.doc.journal_entry),
        __('View'),
      )
    }
  },
  mode_of_payment(frm: any) {
    if (!frm.doc.mode_of_payment || !frm.doc.company) return
    frappe.call({
      method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account',
      args: { mode_of_payment: frm.doc.mode_of_payment, company: frm.doc.company },
      callback(r: any) {
        if (r.message?.account) frm.set_value('bank_account', r.message.account)
      },
    })
  },
})
