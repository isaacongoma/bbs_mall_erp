import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Tenant Arrears Aging'] = {
  filters: [
    {
      fieldname: "company",
      label: __("Company"),
      fieldtype: "Link",
      options: "Company",
      default: frappe.defaults.get_user_default('Company'),
    },
    {
      fieldname: "property",
      label: __("Property"),
      fieldtype: "Link",
      options: "Property",
    },
    {
      fieldname: "customer",
      label: __("Tenant"),
      fieldtype: "Link",
      options: "Customer",
    },
    {
      fieldname: "as_on",
      label: __("As On"),
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    }
  ],
}
