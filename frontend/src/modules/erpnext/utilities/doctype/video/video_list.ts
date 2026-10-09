import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Video'] = {
  onload: (listview?: any) => {
    listview.page.add_menu_item(__('Video Settings'), function () {
      frappe.set_route('Form', 'Video Settings', 'Video Settings')
    })
  },
}
