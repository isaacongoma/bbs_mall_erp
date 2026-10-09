import { frappe } from '@/shared/frappe'
frappe.listview_settings['Permission Log'] = {
  hide_name_column: true,
  onload(listview?: any) {
    if (listview.list_view_settings) {
      listview.list_view_settings.disable_comment_count = 1
    }
  },
}
