import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Transaction Deletion Record'] = {
  add_fields: ['status'],
  get_indicator: function (doc?: any) {
    const colors: any = {
      Queued: 'orange',
      Completed: 'green',
      Running: 'blue',
      Failed: 'red',
    }
    const status = doc.status
    return [__(status), colors[status], 'status,=,' + status]
  },
}
