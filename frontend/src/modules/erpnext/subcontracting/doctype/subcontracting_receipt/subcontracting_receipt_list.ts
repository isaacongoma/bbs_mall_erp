import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Subcontracting Receipt'] = {
  get_indicator: function (doc?: any) {
    const status_colors: any = {
      Draft: 'red',
      Return: 'gray',
      'Return Issued': 'grey',
      Completed: 'green',
    }
    return [__(doc.status), status_colors[doc.status], 'status,=,' + doc.status]
  },
}
