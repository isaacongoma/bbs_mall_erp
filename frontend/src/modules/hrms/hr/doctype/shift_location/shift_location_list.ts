import { frappe, hrms } from '@/shared/frappe'

frappe.listview_settings['Shift Location'] = {
  onload: (list_view: any) => hrms.add_shift_tools_button_to_list(list_view),
}
