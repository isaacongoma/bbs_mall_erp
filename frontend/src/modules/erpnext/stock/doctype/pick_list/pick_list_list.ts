import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Pick List'] = {
  get_indicator: function (doc?: any) {
    const status_colors: any = {
      Draft: 'red',
      Open: 'orange',
      'Partly Delivered': 'orange',
      'Partially Transferred': 'yellow',
      Completed: 'green',
      Cancelled: 'red',
    }
    return [__(doc.status), status_colors[doc.status], 'status,=,' + doc.status]
  },
}
