import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Lease Billing Run', {
  refresh(frm: any) {
    if (frm.doc.docstatus === 0 && !frm.is_new()) {
      frm.add_custom_button(__('Refresh Due Leases'), () => {
        frm.call({
          doc: frm.doc,
          method: 'fetch_due_leases',
          freeze: true,
          callback: () => frm.reload_doc(),
        })
      })
      frm.dashboard.add_comment(
        __('Submit this run to create the invoices for every lease listed below.'),
        'blue',
        true,
      )
    }
    if (frm.doc.docstatus === 1) {
      frm.add_custom_button(__('View Invoices'), () => {
        frappe.set_route('List', 'Sales Invoice', {
          name: ['in', (frm.doc.items || []).map((row: any) => row.sales_invoice).filter(Boolean)],
        })
      })
      if (frm.doc.errors)
        frm.dashboard.add_comment(
          __('{0} lease(s) could not be invoiced. See the Message column.', [frm.doc.errors]),
          'red',
          true,
        )
    }
  },
  company(frm: any) {
    frm.set_value('property', null)
  },
})
