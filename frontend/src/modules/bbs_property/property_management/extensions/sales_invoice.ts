import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Sales Invoice', {
  refresh(frm: any) {
    if (frm.is_new() || !frm.doc.lease) return
    frm.add_custom_button(
      __('Lease Agreement'),
      () => frappe.set_route('Form', 'Lease Agreement', frm.doc.lease),
      __('View'),
    )
    if (frm.doc.billing_period_start && frm.doc.billing_period_end) {
      frm.dashboard.add_comment(
        __('Rent for {0} to {1}', [
          frappe.datetime.str_to_user(frm.doc.billing_period_start),
          frappe.datetime.str_to_user(frm.doc.billing_period_end),
        ]),
        'blue',
        true,
      )
    }
  },
})
