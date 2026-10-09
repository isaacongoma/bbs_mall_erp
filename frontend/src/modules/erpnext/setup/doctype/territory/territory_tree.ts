import { frappe } from '@/shared/frappe'
frappe.treeview_settings['Territory'] = {
  ignore_fields: ['parent_territory'],
}
