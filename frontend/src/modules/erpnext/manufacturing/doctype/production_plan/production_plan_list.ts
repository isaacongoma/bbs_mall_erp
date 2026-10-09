import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Production Plan'] = {
  hide_name_column: true,
  add_fields: ['status'],
  filters: [['status', '!=', 'Closed']],
  get_indicator: function (doc?: any) {
    if (doc.status === 'Submitted') {
      return [__('Not Started'), 'orange', 'status,=,Submitted']
    } else {
      return [
        __(doc.status),
        (
          {
            Draft: 'red',
            'In Process': 'orange',
            Completed: 'green',
            'Material Requested': 'yellow',
            Cancelled: 'gray',
            Closed: 'grey',
          } as any
        )[doc.status],
        'status,=,' + doc.status,
      ]
    }
  },
}
