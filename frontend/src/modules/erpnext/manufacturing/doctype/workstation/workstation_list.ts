import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Workstation'] = {
  add_fields: ['status'],
  get_indicator: function (doc?: any) {
    const color_map: any = {
      Production: 'green',
      Off: 'gray',
      Idle: 'gray',
      Problem: 'red',
      Maintenance: 'yellow',
      Setup: 'blue',
    }
    return [__(doc.status), color_map[doc.status], 'status,=,' + doc.status]
  },
}
