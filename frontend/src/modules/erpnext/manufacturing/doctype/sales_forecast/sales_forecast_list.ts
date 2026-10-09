import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Sales Forecast'] = {
  add_fields: ['status'],
  get_indicator: function (doc?: any) {
    if (doc.status === 'Planned') {
      return [__('Planned'), 'orange', 'status,=,Planned']
    } else if (doc.status === 'MPS Generated') {
      return [__('MPS Generated'), 'green', 'status,=,MPS Generated']
    }
  },
}
