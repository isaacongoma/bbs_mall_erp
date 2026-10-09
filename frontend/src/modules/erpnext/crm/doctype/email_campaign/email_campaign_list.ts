import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Email Campaign'] = {
  get_indicator: function (doc?: any) {
    const colors: any = {
      Unsubscribed: 'red',
      Scheduled: 'blue',
      'In Progress': 'orange',
      Completed: 'green',
    }
    return [__(doc.status), colors[doc.status], 'status,=,' + doc.status]
  },
}
