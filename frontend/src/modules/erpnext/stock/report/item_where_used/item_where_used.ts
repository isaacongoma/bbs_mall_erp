import { __, frappe } from '@/shared/frappe'
frappe.query_reports['Item Where Used'] = {
  filters: [
    {
      fieldname: 'item',
      label: __('Item'),
      fieldtype: 'Link',
      options: 'Item',
      reqd: 1,
    },
    {
      fieldname: 'company',
      label: __('Company'),
      fieldtype: 'Link',
      options: 'Company',
    },
    {
      fieldname: 'section',
      label: __('Section'),
      fieldtype: 'Select',
      options: '\nWhere Used\nReferences',
    },
  ],
}
