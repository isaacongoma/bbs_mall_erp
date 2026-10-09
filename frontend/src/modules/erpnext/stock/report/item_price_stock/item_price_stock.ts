import { __, frappe } from '@/shared/frappe'
frappe.query_reports['Item Price Stock'] = {
  filters: [
    {
      fieldname: 'item_code',
      label: __('Item'),
      fieldtype: 'Link',
      options: 'Item',
    },
  ],
}
