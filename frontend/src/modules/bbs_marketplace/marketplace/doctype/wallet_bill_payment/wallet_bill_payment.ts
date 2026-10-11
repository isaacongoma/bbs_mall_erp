import { flt, frappe } from '@/shared/frappe'
import { viewButton } from '../../actions'

frappe.ui.form.on('Wallet Bill Payment', {
  setup(frm: any) {
    frm.set_query('sales_invoice', 'invoices', () => ({
      filters: { docstatus: 1, outstanding_amount: ['>', 0], customer: frm.doc.customer },
    }))
  },

  refresh(frm: any) {
    viewButton(frm, 'Seller', 'Marketplace Seller', frm.doc.seller)
    viewButton(frm, 'Journal Entry', 'Journal Entry', frm.doc.journal_entry)
  },

  seller(frm: any) {
    if (!frm.doc.seller) return
    frappe.db.get_value('Marketplace Seller', frm.doc.seller, 'customer').then((r: any) => frm.set_value('customer', r.message?.customer))
  },
})

frappe.ui.form.on('Wallet Bill Invoice', {
  sales_invoice(_frm: any, cdt: string, cdn: string) {
    const row = frappe.get_doc(cdt, cdn)
    if (!row.sales_invoice) return
    frappe.db.get_value('Sales Invoice', row.sales_invoice, 'outstanding_amount').then((r: any) => {
      frappe.model.set_value(cdt, cdn, 'allocated_amount', flt(r.message?.outstanding_amount))
    })
  },
})
