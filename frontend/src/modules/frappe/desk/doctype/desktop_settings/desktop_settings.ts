import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Desktop Settings', {
  refresh(frm?: any) {
    frm.add_custom_button(__('Visit Desktop'), () => frappe.set_route('desktop'))
  },
})
