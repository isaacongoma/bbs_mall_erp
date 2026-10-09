import { frappe } from '@/shared/frappe'
frappe.listview_settings['Integration Request'] = {
  onload: function (list_view?: any) {
    frappe.require('logtypes.bundle.js', () => {
      frappe.utils.logtypes.show_log_retention_message(list_view.doctype)
    })
  },
}
