import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Turnover vs Base Rent'] = {
  filters: [
    {
      fieldname: 'property',
      label: __('Property'),
      fieldtype: 'Link',
      options: 'Property',
    },
    {
      fieldname: 'customer',
      label: __('Tenant'),
      fieldtype: 'Link',
      options: 'Customer',
    },
    {
      fieldname: 'from_date',
      label: __('From'),
      fieldtype: 'Date',
      default: frappe.datetime.add_months(frappe.datetime.month_start(), -11),
    },
    {
      fieldname: 'to_date',
      label: __('To'),
      fieldtype: 'Date',
      default: frappe.datetime.month_end(),
    },
  ],
}
