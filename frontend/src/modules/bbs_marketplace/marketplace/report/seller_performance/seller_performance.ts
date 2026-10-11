import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Seller Performance'] = {
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
      options: '\nPending Approval\nActive\nSuspended\nRejected\nClosed',
    },
    {
      fieldname: 'kyc_status',
      label: __('KYC Status'),
      fieldtype: 'Select',
      options: '\nPending\nVerified\nRejected',
    },
  ],
}
