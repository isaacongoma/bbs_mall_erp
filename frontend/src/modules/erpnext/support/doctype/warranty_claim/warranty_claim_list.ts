import { frappe } from '@/shared/frappe'
frappe.listview_settings['Warranty Claim'] = {
  add_fields: ['status', 'customer', 'item_code'],
  filters: [['status', '=', 'Open']],
}
