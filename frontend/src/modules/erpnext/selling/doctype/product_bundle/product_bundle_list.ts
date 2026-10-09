import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Product Bundle'] = {
  add_fields: ['is_active', 'disabled'],
  get_indicator(doc?: any) {
    if (doc.disabled) {
      return [__('Disabled'), 'grey', 'disabled,=,1']
    }
    if (doc.docstatus === 1 && doc.is_active) {
      return [__('Active'), 'green', 'is_active,=,1|disabled,=,0|docstatus,=,1']
    }
    if (doc.docstatus === 1 && !doc.is_active) {
      return [__('Inactive'), 'gray', 'is_active,=,0|docstatus,=,1']
    }
  },
}
