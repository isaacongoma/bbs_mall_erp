import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Tenant Sales Declaration', {
  setup(frm: any) {
    frm.set_query('lease', () => ({
      filters: { docstatus: 1, turnover_rent_applicable: 1, status: ['in', ['Active', 'Expiring Soon']] },
    }))
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
          __('Reject Declaration'),
        )
      })
    }
  },
})
