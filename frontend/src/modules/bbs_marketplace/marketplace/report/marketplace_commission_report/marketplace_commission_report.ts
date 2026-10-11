import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Marketplace Commission Report'] = {
  filters: [
    {
      fieldname: 'seller',
      label: __('Seller'),
      fieldtype: 'Link',
      options: 'Marketplace Seller',
    },
    {
      fieldname: 'settlement_status',
      label: __('Settlement'),
      fieldtype: 'Select',
      options: '\nUnsettled\nHeld\nSettled\nReversed',
    },
    {
      fieldname: 'from_date',
      label: __('From Date'),
      fieldtype: 'Date',
      default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
    },
    {
      fieldname: 'to_date',
      label: __('To Date'),
      fieldtype: 'Date',
      default: frappe.datetime.get_today(),
    },
  ],
}
