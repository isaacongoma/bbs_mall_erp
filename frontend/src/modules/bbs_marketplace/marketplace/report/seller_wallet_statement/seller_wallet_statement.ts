import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Seller Wallet Statement'] = {
  filters: [
    {
      fieldname: 'seller',
      label: __('Seller'),
      fieldtype: 'Link',
      options: 'Marketplace Seller',
      reqd: 1,
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
    {
      fieldname: 'status',
      label: __('Status'),
      fieldtype: 'Select',
      options: '\nHeld\nAvailable\nPosted',
    },
  ],
}
