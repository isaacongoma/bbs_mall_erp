import { __, cur_list, frappe } from '@/shared/frappe'
frappe.listview_settings['Activity Log'] = {
  get_indicator: function (doc?: any) {
    if (doc.operation == 'Login' && doc.status == 'Success') return [__(doc.status), 'green']
    else if (doc.operation == 'Login' && doc.status == 'Failed') return [__(doc.status), 'red']
  },
  onload: function () {
    frappe.require('logtypes.bundle.js', () => {
      frappe.utils.logtypes.show_log_retention_message(cur_list.doctype)
    })
  },
}
