import { __, frappe } from '@/shared/frappe'
frappe.query_reports['Share Ledger'] = {
  filters: [
    {
      fieldname: 'date',
      label: __('Date'),
      fieldtype: 'Date',
      default: frappe.datetime.get_today(),
      reqd: 1,
    },
    {
      fieldname: 'shareholder',
      label: __('Shareholder'),
      fieldtype: 'Link',
      options: 'Shareholder',
    },
  ],
}
