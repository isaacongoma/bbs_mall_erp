import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Rent Roll'] = {
  filters: [
    {
      fieldname: 'company',
      label: __('Company'),
      fieldtype: 'Link',
      options: 'Company',
      default: frappe.defaults.get_user_default('Company'),
    },
    {
      fieldname: 'property',
      label: __('Property'),
      fieldtype: 'Link',
      options: 'Property',
    },
    {
      fieldname: 'as_on',
      label: __('As On'),
      fieldtype: 'Date',
      default: frappe.datetime.get_today(),
    },
    {
      fieldname: 'status',
      label: __('Status'),
      fieldtype: 'Select',
      options: '\nVacant\nReserved\nOccupied\nUnder Maintenance',
    },
  ],
}
