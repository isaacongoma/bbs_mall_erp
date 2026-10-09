import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Property Setter', {
  validate: function (frm?: any) {
    if (frm.doc.property_type == 'Check' && !['0', '1'].includes(frm.doc.value)) {
      frappe.throw(__('Value for a check field can be either 0 or 1'))
    }
  },
})
