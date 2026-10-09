import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Repost Payment Ledger'] = {
  add_fields: ['repost_status'],
  get_indicator: function (doc?: any) {
    const colors: any = {
      Queued: 'orange',
      Completed: 'green',
      Failed: 'red',
    }
    const status = doc.repost_status
    return [__(status), colors[status], 'status,=,' + status]
  },
}
