import { __, frappe } from '@/shared/frappe'
frappe.query_reports['Item Wise Consumption'] = {
  filters: [
    {
      fieldname: 'supplier',
      label: __('Supplier'),
      fieldtype: 'Link',
      options: 'Supplier',
      width: '80',
    },
    {
      fieldname: 'from_date',
      label: __('From Date'),
      fieldtype: 'Date',
      width: '80',
      default: frappe.datetime.month_start(),
    },
    {
      fieldname: 'to_date',
      label: __('To Date'),
      fieldtype: 'Date',
      width: '80',
      default: frappe.datetime.month_end(),
    },
  ],
}
