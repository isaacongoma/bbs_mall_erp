import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Repost Accounting Ledger'] = {
  add_fields: ['status'],
  get_indicator: function (doc?: any) {
    if (!doc.status) return
    const status_color: any = {
      Queued: 'yellow',
      'In Progress': 'blue',
      'Partially Reposted': 'orange',
      Completed: 'green',
      Failed: 'red',
    }
    return [__(doc.status), status_color[doc.status] || 'gray', 'status,=,' + doc.status]
  },
}
