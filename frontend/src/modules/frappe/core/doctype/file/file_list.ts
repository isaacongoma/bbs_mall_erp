import { frappe } from '@/shared/frappe'
frappe.listview_settings['File'] = {
  formatters: {
    file_name: function (value?: any) {
      return frappe.utils.escape_html(value || '')
    },
  },
}
