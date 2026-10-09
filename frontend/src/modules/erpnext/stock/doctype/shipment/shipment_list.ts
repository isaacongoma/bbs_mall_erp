import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Shipment'] = {
  add_fields: ['status'],
  get_indicator: function (doc?: any) {
    if (doc.status == 'Booked') {
      return [__('Booked'), 'green']
    }
  },
}
