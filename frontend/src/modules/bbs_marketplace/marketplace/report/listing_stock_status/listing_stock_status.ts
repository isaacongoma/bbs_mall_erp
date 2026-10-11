import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Listing Stock Status'] = {
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
      options: '\nDraft\nPending Approval\nApproved\nPublished\nPaused\nRejected\nArchived',
    },
    {
      fieldname: 'low_stock_only',
      label: __('Low Stock Only'),
      fieldtype: 'Check',
    },
  ],
}
