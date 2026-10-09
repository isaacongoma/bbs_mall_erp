import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Serial and Batch Bundle'] = {
  add_fields: ['is_cancelled'],
  get_indicator: function (doc?: any) {
    if (doc.is_cancelled) {
      return [__('Cancelled'), 'red', 'is_cancelled,=,1']
    }
  },
}
