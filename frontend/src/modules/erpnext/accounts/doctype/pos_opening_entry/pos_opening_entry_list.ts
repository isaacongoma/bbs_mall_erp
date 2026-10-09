import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['POS Opening Entry'] = {
  get_indicator: function (doc?: any) {
    const status_color: any = {
      Draft: 'red',
      Open: 'orange',
      Closed: 'green',
      Cancelled: 'red',
    }
    return [__(doc.status), status_color[doc.status], 'status,=,' + doc.status]
  },
}
