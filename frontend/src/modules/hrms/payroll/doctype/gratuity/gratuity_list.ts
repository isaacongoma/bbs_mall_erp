import { __, frappe } from '@/shared/frappe'

frappe.listview_settings['Gratuity'] = {
  get_indicator: function (doc: any) {
    let status_color: any = {
      Draft: 'red',
      Submitted: 'blue',
      Cancelled: 'red',
      Paid: 'green',
      Unpaid: 'orange',
    }
    return [__(doc.status), status_color[doc.status], 'status,=,' + doc.status]
  },
}
