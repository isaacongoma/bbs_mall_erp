import { __, frappe } from '@/shared/frappe'

frappe.listview_settings['Payroll Entry'] = {
  has_indicator_for_draft: 1,
  get_indicator: function (doc: any) {
    let status_color: any = {
      Draft: 'red',
      Submitted: 'blue',
      Queued: 'orange',
      Failed: 'red',
      Cancelled: 'red',
    }
    return [__(doc.status), status_color[doc.status], 'status,=,' + doc.status]
  },
}
