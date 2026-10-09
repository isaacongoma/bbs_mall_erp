import { frappe } from '@/shared/frappe'
frappe.treeview_settings['Item Group'] = {
  ignore_fields: ['parent_item_group'],
}
