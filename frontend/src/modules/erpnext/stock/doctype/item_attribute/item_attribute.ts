import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Item Attribute', {
  numeric_values(frm?: any) {
    if (frm.doc.numeric_values) {
      frm.clear_table('item_attribute_values')
      frm.refresh_field('item_attribute_values')
    }
  },
})
