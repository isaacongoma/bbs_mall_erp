import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Voucher Usage'] = {
  filters: [
    { fieldname: 'seller', label: __('Issued By'), fieldtype: 'Link', options: 'Marketplace Seller' },
    { fieldname: 'status', label: __('Status'), fieldtype: 'Select', options: '\nActive\nPaused\nPending Approval' },
    { fieldname: 'voucher_type', label: __('Type'), fieldtype: 'Select', options: '\nDiscount\nDelivery Discount' },
  ],
}
