import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Maintenance Visit'] = {
  add_fields: ['customer', 'customer_name', 'completion_status', 'maintenance_type'],
  get_indicator: function (doc?: any) {
    const s = doc.completion_status || 'Pending'
    return [
      __(s),
      (
        {
          Pending: 'blue',
          'Partially Completed': 'orange',
          'Fully Completed': 'green',
        } as any
      )[s],
      'completion_status,=,' + doc.completion_status,
    ]
  },
}
