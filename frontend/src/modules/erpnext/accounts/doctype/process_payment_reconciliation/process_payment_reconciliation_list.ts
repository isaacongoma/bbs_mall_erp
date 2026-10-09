import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Process Payment Reconciliation'] = {
  add_fields: ['status'],
  get_indicator: function (doc?: any) {
    const colors: any = {
      Queued: 'orange',
      Paused: 'orange',
      Completed: 'green',
      'Partially Reconciled': 'orange',
      Running: 'blue',
      Failed: 'red',
    }
    const status = doc.status
    return [__(status), colors[status], 'status,=,' + status]
  },
}
