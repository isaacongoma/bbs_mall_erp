import { __, frappe } from '@/shared/frappe'

frappe.query_reports['COD Reconciliation'] = {
  filters: [
    {
      fieldname: 'courier',
      label: __('Courier'),
      fieldtype: 'Link',
      options: 'Courier',
    },
    {
      fieldname: 'status',
      label: __('Shipment Status'),
      fieldtype: 'Select',
      options: '\nPending\nPicked Up\nIn Transit\nOut for Delivery\nDelivered\nFailed Delivery\nReturning\nReturned to Seller',
    },
    {
      fieldname: 'remitted',
      label: __('Remitted'),
      fieldtype: 'Select',
      options: '\n0\n1',
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
