import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Wallet Liability'] = {
  filters: [
    {
      fieldname: 'status',
      label: __('Seller Status'),
      fieldtype: 'Select',
      options: '\nPending Approval\nActive\nSuspended\nRejected\nClosed',
    },
  ],
}
