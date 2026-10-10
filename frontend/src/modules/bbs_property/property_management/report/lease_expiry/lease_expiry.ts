import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Lease Expiry'] = {
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
      fieldname: "within_days",
      label: __("Expiring Within (days)"),
      fieldtype: "Int",
      default: 180,
    }
  ],
}
