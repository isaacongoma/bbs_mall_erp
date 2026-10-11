import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Returns Summary'] = {
  filters: [
    {
      fieldname: 'seller',
      label: __('Seller'),
      fieldtype: 'Link',
      options: 'Marketplace Seller',
    },
    {
      fieldname: 'status',
      label: __('Status'),
      fieldtype: 'Select',
      options: '\nRequested\nApproved\nRejected\nPickup Scheduled\nReceived\nRefunded\nClosed',
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
