import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Daily Work Summary Group', {
  refresh: function (frm: any) {
    if (!frm.is_new()) {
      frm.add_custom_button(__('Daily Work Summary'), function () {
        frappe.set_route('List', 'Daily Work Summary')
      })
    }
  },
})
