import { __, erpnext, frappe } from '@/shared/frappe'
frappe.query_reports['IRS 1099'] = {
  filters: [
    {
      fieldname: 'company',
      label: __('Company'),
      fieldtype: 'Link',
      options: 'Company',
      default: frappe.defaults.get_user_default('Company'),
      reqd: 1,
      width: 80,
    },
    {
      fieldname: 'fiscal_year',
      label: __('Fiscal Year'),
      fieldtype: 'Link',
      options: 'Fiscal Year',
      default: erpnext.utils.get_fiscal_year(frappe.datetime.get_today()),
      reqd: 1,
      width: 80,
    },
    {
      fieldname: 'supplier_group',
      label: __('Supplier Group'),
      fieldtype: 'Link',
      options: 'Supplier Group',
      default: '',
      reqd: 0,
      width: 80,
    },
  ],
}
