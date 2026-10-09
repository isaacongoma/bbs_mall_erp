import { __, frappe } from '@/shared/frappe'
frappe.query_reports['BOM Explorer'] = {
  filters: [
    {
      fieldname: 'bom',
      label: __('BOM'),
      fieldtype: 'Link',
      options: 'BOM',
      reqd: 1,
    },
  ],
}
