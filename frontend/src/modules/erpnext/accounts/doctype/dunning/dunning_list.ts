import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Dunning'] = {
  get_indicator: function (doc?: any) {
    if (doc.status === 'Resolved') {
      return [__('Resolved'), 'green', 'status,=,Resolved']
    } else {
      return [__('Unresolved'), 'red', 'status,=,Unresolved']
    }
  },
}
