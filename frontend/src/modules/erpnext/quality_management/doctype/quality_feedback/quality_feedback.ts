import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Quality Feedback', {
  template: function (frm?: any) {
    if (frm.doc.template) {
      frm.call('set_parameters')
    }
  },
})
