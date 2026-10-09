import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Process Payment Reconciliation Log'] = {
  add_fields: ['status'],
  get_indicator: function (doc?: any) {
    const colors: any = {
      'Partially Reconciled': 'orange',
      Paused: 'orange',
      Reconciled: 'green',
      Failed: 'red',
      Cancelled: 'red',
      Running: 'blue',
    }
    const status = doc.status
    return [__(status), colors[status], 'status,=,' + status]
  },
}
