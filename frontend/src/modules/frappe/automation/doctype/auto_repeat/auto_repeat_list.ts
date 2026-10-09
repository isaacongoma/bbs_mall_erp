import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Auto Repeat'] = {
  add_fields: ['next_schedule_date'],
  get_indicator: function (doc?: any) {
    let colors: any = {
      Active: 'green',
      Disabled: 'red',
      Completed: 'blue',
    }
    return [__(doc.status), colors[doc.status], 'status,=,' + doc.status]
  },
}
