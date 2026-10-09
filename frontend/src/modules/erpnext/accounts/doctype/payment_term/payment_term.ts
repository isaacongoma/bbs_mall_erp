import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Payment Term', {
  onload(frm?: any) {
    frm.trigger('set_dynamic_description')
  },
  discount(frm?: any) {
    frm.trigger('set_dynamic_description')
  },
  discount_type(frm?: any) {
    frm.trigger('set_dynamic_description')
  },
  set_dynamic_description(frm?: any) {
    if (frm.doc.discount) {
      let description = __('{0}% of total invoice value will be given as discount.', [frm.doc.discount])
      if (frm.doc.discount_type == 'Amount') {
        description = __('{0} will be given as discount.', [frm.doc.discount])
      }
      frm.set_df_property('discount', 'description', description)
    }
  },
})
