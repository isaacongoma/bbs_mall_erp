import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Process Period Closing Voucher'] = {
  add_fields: ['status'],
  get_indicator: function (doc?: any) {
    const status_colors: any = {
      Queued: 'blue',
      Running: 'orange',
      Paused: 'gray',
      Completed: 'green',
      Cancelled: 'red',
    }
    return [__(doc.status), status_colors[doc.status], 'status,=,' + doc.status]
  },
}
