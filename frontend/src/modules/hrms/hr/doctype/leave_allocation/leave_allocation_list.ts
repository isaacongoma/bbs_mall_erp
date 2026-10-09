import { __, frappe } from '@/shared/frappe'

frappe.listview_settings['Leave Allocation'] = {
  get_indicator: function (doc: any) {
    if (doc.status === 'Expired') {
      return [__('Expired'), 'gray', 'expired, =, 1']
    }
  },
}
