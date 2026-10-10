import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Meter Reading', {
  setup(frm: any) {
    frm.set_query('meter', () => ({ filters: { status: 'Active' } }))
  },
  refresh(frm: any) {
    if (frm.is_new()) return
    if (frm.doc.status === 'Pending Approval') {
      frm.add_custom_button(__('Approve'), () => {
        frm.call({ doc: frm.doc, method: 'approve', freeze: true, callback: () => frm.reload_doc() })
      })
      frm.add_custom_button(__('Reject'), () => {
        frappe.prompt(
          { fieldname: 'reason', fieldtype: 'Small Text', label: __('Reason') },
          (values: any) => {
            frm.call({
              doc: frm.doc,
              method: 'reject',
              args: { reason: values.reason },
              callback: () => frm.reload_doc(),
            })
          },
          __('Reject Reading'),
        )
      })
    }
    if (frm.doc.sales_invoice) {
      frm.add_custom_button(
        __('Invoice'),
        () => frappe.set_route('Form', 'Sales Invoice', frm.doc.sales_invoice),
        __('View'),
      )
    }
  },
})
