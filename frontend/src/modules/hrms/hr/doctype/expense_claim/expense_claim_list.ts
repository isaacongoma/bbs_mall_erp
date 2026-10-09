import { frappe } from '@/shared/frappe'

frappe.listview_settings['Expense Claim'] = {
  add_fields: ['company'],
}
