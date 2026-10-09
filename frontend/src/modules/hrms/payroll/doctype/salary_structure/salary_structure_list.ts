import { __, frappe } from '@/shared/frappe'

frappe.listview_settings['Salary Structure'] = {
  onload: function (list_view: any) {
    list_view.page.add_inner_button(__('Bulk Salary Structure Assignment'), function () {
      frappe.set_route('Form', 'Bulk Salary Structure Assignment')
    })
  },
}
