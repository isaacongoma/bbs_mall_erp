import { cur_list, frappe } from '@/shared/frappe'
frappe.listview_settings['Notification Log'] = {
  onload: function () {
    frappe.require('logtypes.bundle.js', () => {
      frappe.utils.logtypes.show_log_retention_message(cur_list.doctype)
    })
  },
}
