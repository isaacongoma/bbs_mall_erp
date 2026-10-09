import { __, frappe } from '@/shared/frappe'

frappe.listview_settings['Interview'] = {
  has_indicator_for_draft: 1,
  get_indicator: function (doc: any) {
    let status_color: any = {
      Pending: 'orange',
      'Under Review': 'blue',
      Cleared: 'green',
      Rejected: 'red',
    }
    return [__(doc.status), status_color[doc.status], 'status,=,' + doc.status]
  },
}
