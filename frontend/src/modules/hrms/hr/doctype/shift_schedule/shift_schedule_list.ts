import { frappe, hrms } from '@/shared/frappe'

frappe.listview_settings['Shift Schedule'] = {
  onload: (list_view: any) => hrms.add_shift_tools_button_to_list(list_view, 'Assign Shift Schedule'),
}
