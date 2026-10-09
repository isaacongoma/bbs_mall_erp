import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Print Style', {
  refresh: function (frm?: any) {
    frm.add_custom_button(__('Print Settings'), () => {
      frappe.set_route('Form', 'Print Settings')
    })
  },
})
