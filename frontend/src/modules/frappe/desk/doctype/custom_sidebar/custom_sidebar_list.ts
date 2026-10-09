import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Custom Sidebar'] = {
  add_fields: ['user'],
  filters: [['user', '=', '']],
  get_indicator(doc?: any) {
    return doc.user ? [__('User'), 'gray', 'user,!=,'] : [__('Site'), 'blue', 'user,=,']
  },
}
