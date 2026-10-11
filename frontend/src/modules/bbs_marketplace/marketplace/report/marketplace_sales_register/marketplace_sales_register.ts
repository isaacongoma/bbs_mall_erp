import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Marketplace Sales Register'] = {
  filters: [
    {
      fieldname: 'company',
      label: __('Company'),
      fieldtype: 'Link',
      options: 'Company',
      default: frappe.defaults.get_user_default('Company'),
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
      fieldname: 'customer',
      label: __('Customer'),
      fieldtype: 'Link',
      options: 'Customer',
    },
    {
      fieldname: 'buyer_type',
      label: __('Buyer Type'),
      fieldtype: 'Select',
      options: '\nB2C\nB2B',
    },
    {
      fieldname: 'status',
      label: __('Status'),
      fieldtype: 'Select',
      options: '\nPending Payment\nPaid\nProcessing\nPartially Shipped\nShipped\nDelivered\nCompleted\nCancelled\nRefunded\nFailed',
    },
    {
      fieldname: 'payment_status',
      label: __('Payment Status'),
      fieldtype: 'Select',
      options: '\nUnpaid\nPending\nPaid\nPartially Refunded\nRefunded\nFailed',
    },
    {
      fieldname: 'payment_method',
      label: __('Payment Method'),
      fieldtype: 'Select',
      options: '\nM-Pesa\nCard\nBank Transfer\nCash on Delivery\nWallet\nCredit Terms\nAirtel Money',
    },
  ],
}
