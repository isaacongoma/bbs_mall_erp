import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Subcontracting Inward Order'] = {
  get_indicator: function (doc?: any) {
    const status_colors: any = {
      Draft: 'red',
      Open: 'orange',
      Ongoing: 'yellow',
      Produced: 'blue',
      Delivered: 'green',
      Returned: 'grey',
      Closed: 'grey',
      Cancelled: 'red',
    }
    return [__(doc.status), status_colors[doc.status], 'status,=,' + doc.status]
  },
}
