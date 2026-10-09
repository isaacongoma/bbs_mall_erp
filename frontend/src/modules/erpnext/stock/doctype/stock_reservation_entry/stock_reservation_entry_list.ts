import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Stock Reservation Entry'] = {
  filters: [['status', '!=', 'Cancelled']],
  get_indicator: function (doc?: any) {
    const status_colors: any = {
      Draft: 'red',
      'Partially Reserved': 'orange',
      Reserved: 'blue',
      'Partially Delivered': 'purple',
      Delivered: 'green',
      Cancelled: 'red',
    }
    return [__(doc.status), status_colors[doc.status], 'status,=,' + doc.status]
  },
}
